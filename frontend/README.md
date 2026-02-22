# ConceptClarity Frontend - Premium React Experience

ConceptClarity is a modern, responsive React application designed for high-performance scientific learning. It features a gamified experience, advanced data visualization, and a state-of-the-art UI/UX.

## 🚀 Key Modules

-   **Search Engine**: Adaptive complexity levels (Easy/Medium/Hard) and multilingual support (EN/HI/TE).
-   **Image Analysis (Lens)**: Advanced image upload and drag-and-drop analysis with a premium modal interface.
-   **Quiz System**: Dynamic, time-based quizzes with a real-time podium leaderboard.
-   **Admin Suite**: Interactive analytics dashboard with Chart.js integration and data export capabilities.
-   **User Profile**: Comprehensive profile management including application feedback and search history.

## 📁 Project Structure

```
frontend/
├── public/                # Static assets (Favicons, manifest, etc.)
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── CustomSelect.js # Premium generalized dropdown component
│   │   ├── Navbar.js      # Consolidated navigation with unified styles
│   │   └── HistoryModal.js # Interactive search history portal
│   ├── pages/            # Page components
│   │   ├── Home.js        # Search & Lens entry point
│   │   ├── QuizPage.js    # Gamified quiz & leaderboard
│   │   ├── AdminDashboard.js # Analytics & metadata management
│   │   ├── Profile.js     # User preferences & history
│   │   ├── Login.js       # Re-designed auth experience
│   │   └── Signup.js      # Robust user registration
│   ├── services/         # API & networking
│   │   └── api.js         # Centralized Axios with authentication
│   ├── utils/            # Shared utilities
│   │   └── translations.js # Multilingual dictionary system
│   ├── App.js            # Main routing & global state
│   └── App.css           # Core layout & global overrides
├── package.json          # Dependencies (Chart.js, Axios, XLSX)
└── README.md             # Technical documentation
```

## 🎨 Professional Styling System

-   **Glassmorphism**: Modern backdrop filters and subtle transparency for a premium feel.
-   **Themed Layouts**: Unified CSS variables in `App.css` and `Auth.css` for consistent branding.
-   **Responsive Design**: Mobile-optimized components using media queries for all devices.
-   **Consolidated CSS**: Specialized stylesheets for Home, Quiz, and Admin pages to maintain clarity.

## 🛠️ Requirements & Installation

1. Navigate to `frontend/`: `cd frontend`
2. Install dependencies: `npm install`
3. Run development: `npm start` (Runs on `localhost:3000`)
4. Build for production: `npm run build`

## 📊 Analytics & Reporting

The **Admin Dashboard** utilizes `Chart.js` for real-time visualization of:
-   **Search Complexity Distribution**
-   **Multilingual Adoption**
-   **Device/Source Analytics**
-   **User Engagement Metrics**

Reports can be exported as **Excel** or **CSV** directly from the dashboard for professional reporting.

## 🔐 Security

-   **JWT-Based Auth**: Secure token-based session management stored in `localStorage`.
-   **Protected Routes**: Automated redirection for unauthenticated users across Quiz and Profile pages.
-   **Credential Safety**: Robust password strength validation in the Signup workflow.

---
**Note**: This frontend is built with **Create React App (CRA) 5.0.1**, ensuring a standardized, reliable build pipeline and optimized production bundles.