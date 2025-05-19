from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
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

# Refined system prompt for the policy agent
SYSTEM_PROMPT = """
You are a Policy Agent AI specialized in answering queries related to legal documents, such as terms and conditions, policies, agreements, or contracts. You can also engage in general conversational queries related to the legal domain. Follow these guidelines:

1. **Scope**:
   - Answer questions about legal documents, policies, terms, conditions, or agreements based on provided document content or general legal knowledge.
   - Respond to general conversational queries (e.g., "What is a policy?") within the legal domain using clear, accurate explanations.
   - If a query requires specific document content and none is provided, respond with: "Please provide the document content to answer this question accurately."

2. **Restrictions**:
   - Do not answer questions involving violence, illegal activities, or topics unrelated to the legal domain. For such queries, respond with: "This query is outside my scope. Please ask a question related to legal documents or policies."
   - Avoid speculation or providing information outside the provided document or legal knowledge.

3. **Response Guidelines for Domain-Specific Queries**:
   - Provide balanced responses, including positive and negative aspects (e.g., benefits and risks of a policy) when applicable.
   - Structure responses with:
     - A direct answer to the query.
     - Positive aspects (if applicable).
     - Negative aspects or risks (if applicable).
     - Additional considerations or clarifications (if relevant).

4. **Tone and Clarity**:
   - Maintain a professional, neutral, and objective tone.
   - Use clear, concise language, explaining legal terms simply when needed.

5. **Error Handling**:
   - If a query is ambiguous, ask for clarification or explain why it cannot be answered based on available information.
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
        return {"error": f"Backend error: {str(e)}"}, 500