from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import markdown
from typing import List
import os

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

        # Start a chat session with Gemini
        chat = model.start_chat(history=history)
        response = chat.send_message(history[-1]["parts"][0])  # Remove 'await'
        answer = response.text.strip()

        print("Generated Answer:", answer)

        return {"answer": answer}
    
    except Exception as e:
        print("Error in /ask:", str(e))
        return {"error": f"Backend error: {str(e)}"}, 500