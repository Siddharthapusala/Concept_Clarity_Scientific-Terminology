# ConceptClarity

ConceptClarity is a full-stack web application designed to explain scientific concepts clearly and concisely. It uses advanced Large Language Models (LLMs) to provide definitions and examples tailored to different complexity levels (Easy, Medium, Hard).

## Features

-   **Instant Explanations**: Type any scientific term (e.g., "Photosynthesis", "Black Hole") to get an immediate explanation.
-   **Adaptive Complexity**: Choose between **Simple** (2 lines), **Medium** (4 lines), or **Hard** (6-8 lines) explanations.
-   **Voice Search**: Use the microphone button to search using voice commands.
-   **Text-to-Speech**: Listen to the explanations with built-in text-to-speech.
-   **Enhanced Mobile Experience**: Optimized card-based layout for mobile users with touch-friendly controls.

## Tech Stack

-   **Frontend**: React.js, CSS3 (Custom responsive styling)
-   **Backend**: Python (FastAPI), SQLAlchemy (PostgreSQL/SQLite)
-   **AI/LLM**: Groq API (Llama 3) for high-speed inference

## Setup Instruction

### Prerequisites
-   Node.js (v16+)
-   Python (v3.9+)
-   Groq API Key (Get one from [Groq Console](https://console.groq.com/))

### 1. Backend Setup

1.  Navigate to the backend folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Create a `.env` file in the `backend/` directory:
    ```ini
    GROQ_API_KEY=your_actual_groq_api_key_here
    DATABASE_URL=sqlite:///./concept_clarity.db  # Or your PostgreSQL URL
    SECRET_KEY=your_secret_key
    ```
4.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```

### 2. Frontend Setup

1.  Navigate to the frontend folder:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the app:
    ```bash
    npm start
    ```
    The app will open at `http://localhost:3000`.

## License

This project is open source and available for public use.
