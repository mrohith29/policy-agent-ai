from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, UUID4
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageIn(BaseModel):
    user_id: str
    conversation_id: UUID4
    messages: List[dict]

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

def validate_uuid(uuid_str: str) -> bool:
    try:
        uuid.UUID(str(uuid_str))
        return True
    except ValueError:
        return False

def serialize_response(data):
    """Helper function to serialize response data with UUID handling"""
    return json.loads(json.dumps(data, cls=UUIDEncoder))

@app.post("/ask")
async def ask_question(query: MessageIn):
    try:
        if not validate_uuid(query.conversation_id):
            raise HTTPException(status_code=400, detail="Invalid conversation ID format")

        user_message = query.messages[-1]['content']
        history = [{"role": "user" if m["type"] == "user" else "model", "parts": [m["content"]]} for m in query.messages]

        chat = model.start_chat(history=history[:-1])
        response = chat.send_message(SYSTEM_PROMPT + "\nUser Query: " + user_message)
        answer = response.text.strip()

        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Convert UUID to string before inserting
        conversation_id_str = str(query.conversation_id)
        supabase.table("messages").insert([
            {"conversation_id": conversation_id_str, "sender": "user", "content": user_message},
            {"conversation_id": conversation_id_str, "sender": "ai", "content": answer},
        ]).execute()

        return serialize_response({"answer": answer})

    except Exception as e:
        logger.error(f"Error in ask_question: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/conversations/{user_id}")
async def get_conversations(user_id: str):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        response = supabase.table("conversations").select("*").eq("user_id", user_id).order("created_at").execute()
        return serialize_response(response.data)
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    if not validate_uuid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        response = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        return serialize_response(response.data)
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_ext = os.path.splitext(file.filename)[1].lower()
        temp_path = f"temp_uploaded{file_ext}"

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = parse_file(temp_path, file_ext)
        os.remove(temp_path)

        return JSONResponse(content={"text": text})
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversations")
async def create_conversation(conv: NewConversation):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        conversation_id = uuid.uuid4()
        response = supabase.table("conversations").insert({
            "id": str(conversation_id),  # Convert UUID to string
            "user_id": conv.user_id,
            "title": conv.title
        }).execute()
        
        if response.data:
            return serialize_response({"id": response.data[0]["id"]})
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, body: RenameConversation):
    if not validate_uuid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        response = supabase.table("conversations").update({"title": body.title}).eq("id", conversation_id).execute()
        if response.data:
            return serialize_response({"status": "success"})
        raise HTTPException(status_code=500, detail="Failed to rename conversation")
    except Exception as e:
        logger.error(f"Error renaming conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    if not validate_uuid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # First delete all messages in the conversation
        supabase.table("messages").delete().eq("conversation_id", conversation_id).execute()
        
        # Then delete the conversation itself
        response = supabase.table("conversations").delete().eq("id", conversation_id).execute()
        
        if response.data:
            return serialize_response({"status": "success", "message": "Conversation deleted successfully"})
        raise HTTPException(status_code=404, detail="Conversation not found")
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
