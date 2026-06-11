"""
Module 2 — FastAPI Application Entry Point
===========================================
Initializes FastAPI, mounts routes, configures CORS, and handles startup/shutdown events.

Usage:
    python backend/main.py
    # or
    uvicorn backend.main:app --reload --port 8000
"""

import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# Ensure imports work whether run from parent folder or from inside backend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from backend.config import API_HOST, API_PORT, CORS_ORIGINS
from backend.data.database import get_data_store
from backend.api.routes import router

app = FastAPI(
    title="Autonomous Financial Investigation System — Module 2 API",
    description="Backend API for User Behavior & Investigation Engine. Running 5 analytical engines + LangChain Ollama.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints router
app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """
    On startup, load synthetic data into memory DataStore.
    """
    db = get_data_store()
    print("🚀 Starting Module 2 REST API Server...")
    db.load_all()
    print("🎯 DataStore initialized. API is ready to accept requests.")


@app.on_event("shutdown")
def shutdown_event():
    """
    Close DB connection on shutdown.
    """
    db = get_data_store()
    db.close()
    print("💤 API server shutting down cleanly.")


@app.get("/", include_in_schema=False)
async def docs_redirect():
    """Redirect root access to Swagger API docs."""
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    # Start uvicorn server directly
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=True)
