from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List
import os
from fastapi import UploadFile, File
from fastapi.responses import JSONResponse
import shutil
from .parsers import parse_file


load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    messages: List[dict]

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

genai.configure(api_key=GOOGLE_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")

# Refined system prompt for the policy agent
SYSTEM_PROMPT = """
You're a helpful assistant specialized in understanding and explaining documents such as policies, terms, agreements, contracts, and more. Your goal is to provide accurate, clear, and polite responses based on the content provided or general legal understanding.

- If document content is provided, use it to answer questions.
- If content is not provided and the question needs it, you may gently say: "To answer this accurately, could you upload or share the relevant document?"

Please maintain a humble and friendly tone. If a question is out of scope or unclear, kindly ask for clarification or explain politely why it's difficult to answer.
"""

@app.post("/ask")
async def ask_question(query: Query):
    try:
        print("Received messages:", query.messages)

        # Convert message list to Gemini-compatible history
        history = [
            {"role": "user" if msg["type"] == "user" else "model", "parts": [msg["content"]]}
            for msg in query.messages
        ]

        print("Formatted history:", history)

        # Combine system prompt with user query
        full_prompt = SYSTEM_PROMPT + "\nUser Query: " + history[-1]["parts"][0]

        # Start a chat session with Gemini
        chat = model.start_chat(history=history[:-1])  # Exclude the latest message from history
        response = chat.send_message(full_prompt)
        answer = response.text.strip()

        print("Generated Answer:", answer)

        return {"answer": answer}
    
    except Exception as e:
        print("Error in /ask:", str(e))
        return JSONResponse(status_code=500, content={"error": f"Backend error: {str(e)}"})

    
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_path = f"temp_uploaded{file_ext}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = parse_file(temp_path, file_ext)

    os.remove(temp_path)
    return JSONResponse(content={"text": text})