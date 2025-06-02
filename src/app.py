from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
import shutil
import os
import google.generativeai as genai
from supabase import create_client
from .parsers import parse_file
from pyngrok import ngrok

load_dotenv()

app = FastAPI()

# Configure CORS to allow all origins when using ngrok
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static files first
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

class MessageIn(BaseModel):
    user_id: str
    conversation_id: str
    messages: List[dict]

class NewConversation(BaseModel):
    user_id: str
    title: str

class RenameConversation(BaseModel):
    title: str

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

# API Routes
@app.post("/api/ask")
async def ask_question(query: MessageIn):
    try:
        user_message = query.messages[-1]['content']
        history = [{"role": "user" if m["type"] == "user" else "model", "parts": [m["content"]]} for m in query.messages]

        chat = model.start_chat(history=history[:-1])
        response = chat.send_message(SYSTEM_PROMPT + "\nUser Query: " + user_message)
        answer = response.text.strip()

        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        supabase.table("messages").insert([
            {"conversation_id": query.conversation_id, "sender": "user", "content": user_message},
            {"conversation_id": query.conversation_id, "sender": "ai", "content": answer},
        ]).execute()

        return {"answer": answer}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/conversations/{user_id}")
async def get_conversations(user_id: str):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.table("conversations").select("*").eq("user_id", user_id).order("created_at").execute()
    return response.data

@app.get("/api/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
    return response.data

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_path = f"temp_uploaded{file_ext}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = parse_file(temp_path, file_ext)
    os.remove(temp_path)

    return JSONResponse(content={"text": text})

@app.post("/api/conversations")
async def create_conversation(conv: NewConversation):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.table("conversations").insert({"user_id": conv.user_id, "title": conv.title}).execute()
    if response.data:
        return {"id": response.data[0]["id"]}
    raise HTTPException(status_code=500, detail="Failed to create conversation")

@app.put("/api/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, body: RenameConversation):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.table("conversations").update({"title": body.title}).eq("id", conversation_id).execute()
    if response.data:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to rename conversation")

# Serve the frontend index.html for all other routes
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    
    # Open a ngrok tunnel to the HTTP server
    public_url = ngrok.connect(8000)
    print(f" * ngrok tunnel \"{public_url}\" -> http://127.0.0.1:8000")
    print(f" * Share this URL with your friend: {public_url}")
    
    # Start the FastAPI application
    uvicorn.run(app, host="0.0.0.0", port=8000)
