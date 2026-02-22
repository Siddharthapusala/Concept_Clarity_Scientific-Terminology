# ConceptClarity Backend - High-Performance AI Engine

The ConceptClarity backend is a robust FastAPI-powered engine that handles search logic, adaptive AI explanations, user authentication, and administrative analytics.

## 🚀 Core Features

-   **Adaptive AI Engine**: Integrates with Groq (Llama 3) to provide definitions tailored to complexity levels.
-   **Computer Vision**: Image analysis endpoints for visual concept identification.
-   **Secure Authentication**: JWT-based auth flow with hashed password security (bcrypt).
-   **Gamification API**: Scoring logic, leaderboard management, and time-tracking for quizzes.
-   **Advanced Analytics**: Complex data aggregation for the Admin Dashboard, supporting CSV/Excel exports.
-   **Multilingual Processing**: Optimized prompts for English, Hindi, and Telugu explanations.

## 📁 Project Structure

```
backend/
├── app/                  # Main application logic
│   ├── routes/           # API endpoints
│   │   ├── auth_routes.py # Login, Signup, Profile logic
│   │   ├── search_routes.py # AI Search & Media integration
│   │   └── admin.py      # Analytics & User management
│   ├── models.py         # SQLAlchemy database models
│   ├── schemas.py        # Pydantic models for validation
│   ├── security.py       # JWT & Hashing utilities
│   ├── database.py       # DB connection & Session management
│   ├── main.py           # FastAPI entry point
│   └── utils/            # Helper services (LLM, Media)
├── db/                   # Database migrations and scripts
│   └── migrations/       # SQL migration history
├── requirements.txt      # Python dependencies
└── run.bat               # Development launch script
```

## 🛠️ Setup & Execution

1. Navigate to `backend/`
2. Install dependencies: `pip install -r requirements.txt`
3. Configure `.env`:
    ```ini
    GROQ_API_KEY=your_key
    DATABASE_URL=sqlite:///./concept_clarity.db  # Supports PostgreSQL
    SECRET_KEY=your_secret_key
    ```
4. Run server: `uvicorn app.main:app --reload --port 8000`

## 🔐 API Documentation (Swagger)

Once the server is running, the interactive documentation is available at:
-   **Swagger UI**: `http://localhost:8000/docs`
-   **ReDoc**: `http://localhost:8000/redoc`

## 📦 Key Dependencies

-   **FastAPI**: High-performance web framework.
-   **SQLAlchemy**: Robust SQL toolkit and ORM.
-   **Pydantic**: Data validation using Python type hints.
-   **Groq**: High-speed LLM inference for scientific explanations.
-   **Passlib**: Secure password hashing and verification.

---
**Note**: This backend is designed for high scalability and can be easily migrated from SQLite to production-grade PostgreSQL by simply updating the `DATABASE_URL`.
