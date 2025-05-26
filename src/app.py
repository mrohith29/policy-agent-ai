from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
import shutil
import os
import google.generativeai as genai
from supabase import create_client
from .parsers import parse_file

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
    conversation_id: str
    messages: List[dict]

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

@app.post("/ask")
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

@app.get("/conversations/{user_id}")
async def get_conversations(user_id: str):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.table("conversations").select("*").eq("user_id", user_id).order("created_at").execute()
    return response.data

@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
    return response.data

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_path = f"temp_uploaded{file_ext}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = parse_file(temp_path, file_ext)
    os.remove(temp_path)

    return JSONResponse(content={"text": text})
