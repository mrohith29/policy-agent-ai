from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, UUID4, validator
from dotenv import load_dotenv
from typing import List, Optional
import shutil
import os
import uuid
import google.generativeai as genai
from supabase import create_client
from .parsers import parse_file
import logging
import json
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
from datetime import datetime
import re
from sentence_transformers import SentenceTransformer
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration for production
app.add_middleware(
    CORSMiddleware,
    allow_origins="http://localhost:3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request validation middleware
@app.middleware("http")
async def validate_request(request: Request, call_next):
    start_time = time.time()
    try:
        # Log request
        logger.info(f"Request: {request.method} {request.url}")
        
        # Validate content type for POST/PUT requests
        if request.method in ["POST", "PUT"]:
            content_type = request.headers.get("content-type", "")
            # Allow multipart/form-data for file uploads
            if not (content_type.startswith("application/json") or content_type.startswith("multipart/form-data")):
                raise HTTPException(status_code=400, detail="Invalid content type")
        
        response = await call_next(request)
        
        # Log response time
        process_time = time.time() - start_time
        logger.info(f"Response time: {process_time:.2f}s")
        
        return response
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

class MessageIn(BaseModel):
    user_id: str
    conversation_id: UUID4
    messages: List[dict] # This list now contains user and AI messages
    email: Optional[str] = None  # Accept email from frontend if provided

    @validator('messages')
    def validate_messages(cls, v):
        if not v:
            raise ValueError('Messages cannot be empty')
        # Allow 'system' type for client-side error messages
        for msg in v:
            if 'sender' not in msg or 'content' not in msg:
                raise ValueError('Each message must have sender and content')
            if msg['sender'] not in ['user', 'ai', 'system']:
                raise ValueError('Message sender must be user, ai, or system')
        return v

class NewConversation(BaseModel):
    user_id: str
    title: str

class RenameConversation(BaseModel):
    title: str

# Custom JSON encoder to handle UUID serialization
class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not all([GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    raise EnvironmentError("One or more required environment variables are missing.")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

SYSTEM_PROMPT = """
You're a helpful assistant specialized in understanding and explaining documents such as policies, terms, agreements, contracts, and more. Your goal is to provide accurate, clear, and polite responses based on the content provided or general legal understanding.

- If document content is provided, use it to answer questions.
- If content is not provided and the question needs it, you may gently say: "To answer this accurately, could you upload or share the relevant document?"

Please maintain a humble and friendly tone. If a question is out of scope or unclear, kindly ask for clarification or explain politely why it's difficult to answer.
"""

FREE_USER_CONVERSATION_LIMIT = 1 # Define the limit here as well
FREE_USER_AI_MESSAGE_LIMIT = 10 # Define the limit here as well

def validate_uuid(uuid_str: str) -> bool:
    try:
        uuid.UUID(str(uuid_str))
        return True
    except ValueError:
        return False

def serialize_response(data):
    """Helper function to serialize response data with UUID handling"""
    return json.loads(json.dumps(data, cls=UUIDEncoder))

# Utility functions to keep user counters up to date

def update_user_conversation_count(supabase, user_id):
    # Use direct SQL for accurate count
    sql = f"SELECT COUNT(*) AS count FROM conversations WHERE user_id = '{user_id}'"
    result = supabase.rpc('execute_sql', {'sql': sql}).execute()
    count = 0
    if result.data and isinstance(result.data, list) and len(result.data) > 0:
        count = result.data[0].get('count', 0)
    logger.info(f"Updating conversation_count for user_id={user_id}: {count}")
    supabase.table("users").update({"conversation_count": count}).eq("id", user_id).execute()

def update_user_message_count(supabase, user_id):
    # Use direct SQL for accurate count
    sql = f"SELECT COUNT(*) AS count FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = '{user_id}')"
    result = supabase.rpc('execute_sql', {'sql': sql}).execute()
    count = 0
    if result.data and isinstance(result.data, list) and len(result.data) > 0:
        count = result.data[0].get('count', 0)
    logger.info(f"Updating message_count for user_id={user_id}: {count}")
    supabase.table("users").update({"message_count": count}).eq("id", user_id).execute()

# Load embedding model (use a small, fast one for demo; replace with production model as needed)
EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')

# Helper: chunk text into ~500 token chunks (approx 2000 chars)
def chunk_text(text, max_length=2000):
    paragraphs = text.split('\n')
    chunks = []
    current = ''
    for para in paragraphs:
        if len(current) + len(para) < max_length:
            current += para + '\n'
        else:
            if current:
                chunks.append(current.strip())
            current = para + '\n'
    if current:
        chunks.append(current.strip())
    return chunks

# Helper: embed a list of texts
def embed_texts(texts):
    return EMBEDDING_MODEL.encode(texts).tolist()

@app.post("/ask")
@limiter.limit("10/minute")
async def ask_question(request: Request, query: MessageIn):
    try:
        if not validate_uuid(query.conversation_id):
            raise HTTPException(status_code=400, detail="Invalid conversation ID format")
        logger.info(f"Processing question for user {query.user_id} in conversation {query.conversation_id}")
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # 1. Fetch user profile to check membership status and counters
        try:
            user_profile_response = supabase.table("users").select("membership_status, conversation_count, message_count").eq("id", query.user_id).single().execute()
            logger.info(f"user_profile_response: {user_profile_response}")
            user_membership_status = user_profile_response.data['membership_status']
            conversation_count = user_profile_response.data.get('conversation_count', 0)
            message_count = user_profile_response.data.get('message_count', 0)
        except Exception as e:
            logger.error(f"User profile not found or error fetching for user {query.user_id}: {e}")
            raise HTTPException(status_code=404, detail="User profile not found or database error.")
        
        is_premium_user = user_membership_status == 'premium'

        # 2. Count existing AI messages for the conversation (for reference, but not used for free user limit anymore)
        ai_messages_count_response = supabase.table("messages").select("id").eq("conversation_id", str(query.conversation_id)).eq("sender", "ai").execute()
        if ai_messages_count_response.data is None:
            logger.error("Error counting AI messages: No data returned from Supabase.")
            raise HTTPException(status_code=500, detail="Failed to count AI messages.")
        current_ai_messages_count = len(ai_messages_count_response.data)

        # 3. Enforce conversation/message limits for free users using counters
        if not is_premium_user:
            if conversation_count >= FREE_USER_CONVERSATION_LIMIT:
                raise HTTPException(
                    status_code=403,
                    detail=f"As a free user, you are limited to {FREE_USER_CONVERSATION_LIMIT} conversation. Please upgrade to premium."
                )
            if message_count >= FREE_USER_AI_MESSAGE_LIMIT:
                raise HTTPException(
                    status_code=403,
                    detail=f"As a free user, you are limited to {FREE_USER_AI_MESSAGE_LIMIT} messages. Please upgrade to premium."
                )

        # RAG: Retrieve relevant document_contexts
        rag_context = ""
        # Accept rag_context from frontend if provided
        try:
            body = await request.json()
            if 'rag_context' in body and body['rag_context']:
                rag_context = body['rag_context']
        except Exception:
            pass
        # If not provided, fallback to DB retrieval
        if not rag_context:
            try:
                doc_chunks = supabase.table("document_contexts").select("content, embedding").eq("conversation_id", str(query.conversation_id)).execute()
                def safe_parse_embedding(embedding):
                    if isinstance(embedding, list):
                        return embedding
                    if isinstance(embedding, str):
                        try:
                            return json.loads(embedding)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse embedding string: {embedding}")
                            return []
                    return []
                if doc_chunks.data:
                    # Embed the user question
                    question_embedding = embed_texts([query.messages[-1]['content']])[0]
                    # Compute cosine similarity
                    def cosine(a, b):
                        a = np.array(a)
                        b = np.array(b)
                        norm_a = np.linalg.norm(a)
                        norm_b = np.linalg.norm(b)
                        if norm_a == 0 or norm_b == 0:
                            return 0.0
                        return float(np.dot(a, b) / (norm_a * norm_b))
                    scored = [
                        (cosine(safe_parse_embedding(chunk["embedding"]), question_embedding), chunk["content"])
                        for chunk in doc_chunks.data if chunk.get("embedding")
                    ]
                    logger.info(f"RAG: scored chunks: {[s[0] for s in scored]}")
                    scored.sort(reverse=True)
                    top_chunks = [c for _, c in scored[:3]]
                    if top_chunks:
                        rag_context = "\n---\n".join(top_chunks)
            except Exception as e:
                logger.warning(f"RAG context retrieval failed: {e}")

        # Prepare chat history for the AI model
        user_message_content = query.messages[-1]['content']
        history_for_gemini = []
        for msg in query.messages[:-1]:
            if msg['sender'] == 'user':
                history_for_gemini.append({"role": "user", "parts": [msg["content"]]})
            elif msg['sender'] == 'ai':
                history_for_gemini.append({"role": "model", "parts": [msg["content"]]})

        # Inject RAG context if available
        prompt = SYSTEM_PROMPT
        if rag_context:
            prompt += f"\nRelevant Document Context:\n{rag_context}\n"
        prompt += "\nUser Query: " + user_message_content
        chat = model.start_chat(history=history_for_gemini)
        response = chat.send_message(prompt)
        ai_answer = response.text.strip()

        logger.info(f"Successfully generated AI response for user {query.user_id}")

        # 4. Insert only the AI message into the DB
        ai_message_data = {
            "conversation_id": str(query.conversation_id),
            "sender": "ai",
            "content": ai_answer,
            "content_type": "text",
            "context": {},
            "metadata": {"model_used": "gemini-1.5-flash", "timestamp": datetime.now().isoformat()}
        }
        insert_ai_response = supabase.table("messages").insert([ai_message_data]).execute()
        if insert_ai_response.data is None:
            logger.error("Error inserting AI message: No data returned from Supabase.")
            raise HTTPException(status_code=500, detail="Failed to save AI message.")

        # 5. Update conversation's updated_at and summary
        update_conversation_response = supabase.table("conversations").update({
            "updated_at": datetime.now().isoformat(),
            "summary": ai_answer[:100] + "..." if len(ai_answer) > 100 else ai_answer
        }).eq("id", str(query.conversation_id)).execute()

        if update_conversation_response.data is None:
            logger.warning(f"Failed to update conversation summary/timestamp: No data returned from Supabase.")

        return serialize_response({"answer": ai_answer, "context": rag_context})

    except HTTPException as he:
        logger.warning(f"HTTPException in ask_question: {he.detail} (Status: {he.status_code})")
        return JSONResponse(status_code=he.status_code, content={"error": he.detail})
    except Exception as e:
        logger.error(f"Unhandled error in ask_question: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "An unexpected error occurred."})

@app.get("/conversations/{user_id}")
async def get_conversations(user_id: str):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Select all relevant fields from the new conversations schema
        response = supabase.table("conversations").select("id, title, created_at, updated_at, summary, metadata").eq("user_id", user_id).order("created_at").execute()
        
        if response.error:
            logger.error(f"Error fetching conversations from DB: {response.error.message}")
            raise HTTPException(status_code=500, detail=f"Database error: {response.error.message}")

        conversations_data = response.data

        return serialize_response(conversations_data)
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching conversations.")

@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    try:
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', conversation_id):
            raise HTTPException(status_code=400, detail="Invalid conversation ID format")

        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Select all relevant fields from the new messages schema
        response = supabase.table('messages') \
            .select('id, conversation_id, sender, content, created_at, content_type, context, metadata') \
            .eq('conversation_id', conversation_id) \
            .order('created_at', desc=True) \
            .execute()

        if response.error:
            logger.error(f"Error fetching messages from DB: {response.error.message}")
            raise HTTPException(status_code=500, detail=f"Database error: {response.error.message}")

        messages_data = response.data

        # Reverse the order to get chronological order
        messages = messages_data[::-1]
        
        return {
            "messages": messages,
            "total": len(messages)
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching messages.")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), conversation_id: str = Form(...)):
    try:
        file_ext = os.path.splitext(file.filename)[1].lower()
        temp_path = f"temp_uploaded{file_ext}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        try:
            text = parse_file(temp_path, file_ext)
        except Exception as e:
            os.remove(temp_path)
            logger.error(f"Error parsing file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
        os.remove(temp_path)
        if not text or not isinstance(text, str) or not text.strip():
            logger.error("Parsed document is empty or invalid.")
            raise HTTPException(status_code=400, detail="Parsed document is empty or invalid.")
        # Chunk and embed
        chunks = chunk_text(text)
        if not chunks or all(len(c.strip()) <= 0 for c in chunks):
            logger.error("No valid chunks produced from document.")
            raise HTTPException(status_code=400, detail="No valid chunks produced from document.")
        embeddings = embed_texts(chunks)
        # --- SMART CHUNK SELECTION ---
        # Score by length (info density) and remove near-duplicates
        scored = sorted([(len(c), i, c, e) for i, (c, e) in enumerate(zip(chunks, embeddings)) if len(c.strip()) > 50], reverse=True)
        selected = []
        selected_embeds = []
        max_chunks = 10
        sim_threshold = 0.85
        for _, _, chunk, embed in scored:
            if len(selected) >= max_chunks:
                break
            # Remove near-duplicates (cosine similarity)
            is_duplicate = False
            for e2 in selected_embeds:
                sim = float(np.dot(embed, e2) / (np.linalg.norm(embed) * np.linalg.norm(e2)))
                if sim > sim_threshold:
                    is_duplicate = True
                    break
            if not is_duplicate:
                selected.append((chunk, embed))
                selected_embeds.append(embed)
        # Store in document_contexts if conversation_id is provided
        inserted = []
        errors = []
        if conversation_id:
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            for chunk, embedding in selected:
                embedding_for_db = embedding  # Must be a list of floats for pgvector
                data = {
                    "conversation_id": conversation_id,
                    "content": chunk,
                    "source": file.filename,
                    "source_id": str(uuid.uuid4()),
                    "metadata": {"filename": file.filename},
                    "embedding": embedding_for_db
                }
                res = supabase.table("document_contexts").insert(data).execute()
                if getattr(res, 'status_code', None) in (200, 201) and res.data:
                    inserted.append(res.data)
                else:
                    errors.append(str(res.data))
        if not inserted:
            logger.error("Upload failed: No document chunks stored.")
            return JSONResponse(status_code=400, content={"error": "Upload failed: No document chunks stored.", "details": errors})
        return JSONResponse(content={"text": text, "filename": file.filename, "chunks": len(selected), "conversation_id": conversation_id, "stored": len(inserted)})
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversations")
async def create_conversation(conv: NewConversation):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Fetch user profile for counters
        user_profile_response = supabase.table("users").select("membership_status, conversation_count").eq("id", conv.user_id).single().execute()
        user_membership_status = user_profile_response.data['membership_status']
        conversation_count = user_profile_response.data.get('conversation_count', 0)
        is_premium_user = user_membership_status == 'premium'
        # Enforce conversation limit for free users
        if not is_premium_user and conversation_count >= FREE_USER_CONVERSATION_LIMIT:
            raise HTTPException(status_code=403, detail=f"As a free user, you are limited to {FREE_USER_CONVERSATION_LIMIT} conversation. Please upgrade to premium.")
        # Create conversation
        response = supabase.table("conversations").insert({
            "user_id": conv.user_id,
            "title": conv.title,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }).select("id").single().execute()
        conversation_data = response['data']
        # Always update counts after creation
        update_user_conversation_count(supabase, conv.user_id)
        update_user_message_count(supabase, conv.user_id)
        return serialize_response({"id": conversation_data['id']})
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

@app.put("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, body: RenameConversation):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Frontend now handles rename directly to DB, but this can be a fallback or for server-side rename
        supabase.table("conversations").update({
            "title": body.title,
            "updated_at": datetime.now().isoformat()
        }).eq("id", conversation_id).execute()
        
        return JSONResponse(status_code=200, content={"message": "Conversation renamed successfully"})
    except Exception as e:
        logger.error(f"Error renaming conversation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Get user_id before deleting
        conv = supabase.table("conversations").select("user_id").eq("id", conversation_id).single().execute()
        user_id = conv.data["user_id"] if conv.data else None
        # Delete all messages for this conversation first
        supabase.table("messages").delete().eq("conversation_id", conversation_id).execute()
        # Now delete the conversation
        supabase.table("conversations").delete().eq("id", conversation_id).execute()
        # Always update counts after deletion
        if user_id:
            update_user_conversation_count(supabase, user_id)
            update_user_message_count(supabase, user_id)
        return JSONResponse(status_code=200, content={"message": "Conversation and its messages deleted successfully"})
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/messages")
async def create_message(message: dict):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Insert user message
        insert_result = supabase.table("messages").insert([message]).execute()
        if insert_result.data is None:
            raise HTTPException(status_code=500, detail="Failed to save user message.")
        # Update counts for the user
        conv = supabase.table("conversations").select("user_id").eq("id", message["conversation_id"]).single().execute()
        user_id = conv.data["user_id"] if conv.data else None
        if user_id:
            update_user_message_count(supabase, user_id)
            update_user_conversation_count(supabase, user_id)
        return JSONResponse(status_code=200, content={"message": "User message created successfully"})
    except Exception as e:
        logger.error(f"Error creating user message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Get conversation_id and user_id before deleting
        msg = supabase.table("messages").select("conversation_id").eq("id", message_id).single().execute()
        conversation_id = msg.data["conversation_id"] if msg.data else None
        user_id = None
        if conversation_id:
            conv = supabase.table("conversations").select("user_id").eq("id", conversation_id).single().execute()
            user_id = conv.data["user_id"] if conv.data else None
        supabase.table("messages").delete().eq("id", message_id).execute()
        if user_id:
            update_user_message_count(supabase, user_id)
            update_user_conversation_count(supabase, user_id)
        return JSONResponse(status_code=200, content={"message": "Message deleted successfully"})
    except Exception as e:
        logger.error(f"Error deleting message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/recount")
async def recount_user_counts(user_id: str):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        update_user_conversation_count(supabase, user_id)
        update_user_message_count(supabase, user_id)
        return JSONResponse(status_code=200, content={"message": "User counts updated"})
    except Exception as e:
        logger.error(f"Error recounting user counts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "service": "crispterms-backend"
    }

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
