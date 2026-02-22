from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import Base, engine
from .routes import auth_routes, search_routes, admin


load_dotenv()


Base.metadata.create_all(engine)


app = FastAPI(title="ConceptClarity API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://concept-clarity-scientific-terminology-17an.onrender.com",
        "https://concept-clarity-scientific-terminology-1-vwip.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_routes.router)
app.include_router(search_routes.router)
app.include_router(admin.router)
