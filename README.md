# ConceptClarity

ConceptClarity is a premium full-stack web application designed to unlock the mysteries of science with clear, concise, and adaptive explanations. Using state-of-the-art Large Language Models (LLMs) and computer vision, it provides tailored learning experiences across multiple languages and complexity levels.

## ✨ Features

-   **🧠 Instant Explanations**: Search any scientific term to get AI-powered definitions tailored to your level.
-   **📊 Adaptive Complexity**: Choose between **Easy**, **Medium**, or **Hard** levels to match your understanding.
-   **📷 Image Analysis (Lens)**: Upload or drag-and-drop images to identify scientific concepts using AI vision.
-   **🎮 Gamified Learning**: Test your knowledge with an interactive Quiz system and climb the **Top 10 Commanders** leaderboard.
-   **🌐 Multilingual Support**: Explanations available in **English**, **Hindi**, and **Telugu**.
-   **🎙️ Voice Search**: Seamless hands-free interaction with high-accuracy voice commands.
-   **🔊 Text-to-Speech**: Professional audio playback for all definitions and explanations.
-   **🛡️ Admin Dashboard**: Comprehensive management suite with data visualization (Chart.js), user analytics, and data export (CSV/Excel).
-   **🎬 Rich Media**: Integrated YouTube videos and Wikipedia imagery for enhanced conceptual understanding.
-   **🌙 Dark Mode**: Fully adaptive, premium dark-themed interface for comfortable learning.

## 🛠️ Tech Stack

-   **Frontend**: React.js, Chart.js, Custom CSS3 (High-performance aesthetics)
-   **Backend**: Python (FastAPI), SQLAlchemy, PostgreSQL/SQLite
-   **AI/Vision**: Groq API (Llama 3), Google Lens-style Image Analysis
-   **Utilities**: JWT Auth, XLSX/File-Saver (Reporting), Web Speech API

## 🚀 Setup Instructions

### Prerequisites
-   Node.js (v16+)
-   Python (v3.9+)
-   Groq API Key ([Get one here](https://console.groq.com/))

### 1. Backend Setup
1.  Navigate to `backend/`
2.  `pip install -r requirements.txt`
3.  Configure `.env`:
    ```ini
    GROQ_API_KEY=your_key
    DATABASE_URL=sqlite:///./concept_clarity.db
    SECRET_KEY=your_secret
    ```
4.  Launch server: `uvicorn app.main:app --reload`

### 2. Frontend Setup
1.  Navigate to `frontend/`
2.  `npm install`
3.  Start app: `npm start`
    Available at `http://localhost:3000`.

## 📜 License
This project is open-source and available for educational and professional use.
