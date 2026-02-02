from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
load_dotenv()
from .database import Base, engine
from .routes import auth_routes, search_routes
Base.metadata.create_all(engine)
app = FastAPI(title="ConceptClarity API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://concept-clarity-scientific-terminology.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_routes.router)
app.include_router(search_routes.router)
