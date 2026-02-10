from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from pathlib import Path


env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


DATABASE_URL = os.getenv("DATABASE_URL")


if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300
    )
    SessionLocal = sessionmaker(bind=engine)
else:
    raise ValueError("DATABASE_URL environment variable is not set")


Base = declarative_base()
