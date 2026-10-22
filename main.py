from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import sys
import os
from dotenv import load_dotenv

# Load the secret keys from your .env file into memory
load_dotenv()

# Add the runpod folder to the path so we can import your logic
sys.path.append(os.path.join(os.path.dirname(__file__), "runpod"))
import handler

# Initialize the API
app = FastAPI(title="StockSync AI Engine")

# Crucial: Allow the React frontend and Node backend to communicate with this Python server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the expected JSON format
class InventoryPayload(BaseModel):
    items: List[Dict[str, Any]]

@app.get("/")
def read_root():
    return {"message": "StockSync AI Engine is running perfectly!"}

@app.post("/api/analyze")
def analyze_inventory(payload: InventoryPayload):
    # Pass the incoming data to your logic in handler.py
    recommendations = handler.calculate_restock(payload.items)
    
    # Return the AI recommendations back to the website
    return {
        "status": "success", 
        "recommendations": recommendations
    }