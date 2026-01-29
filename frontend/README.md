# ConceptClarity Frontend - Traditional React Setup

This project has been migrated from Vite to Create React App (traditional React setup).

## 🚀 Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm start
```
The application will open in your browser at `http://localhost:3000`.

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html          # Main HTML template
│   └── manifest.json       # PWA manifest
├── src/
│   ├── components/         # Reusable components
│   │   └── Navbar.js       # Navigation component
│   ├── pages/             # Page components
│   │   ├── Login.js       # Login page
│   │   ├── Signup.js      # Signup page
│   │   └── Home.js        # Home page (search functionality)
│   ├── services/          # API services
│   │   └── api.js         # Axios configuration
│   ├── App.js             # Main application component
│   ├── App.css            # Global styles
│   └── index.js           # Application entry point
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🛠 Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (irreversible)

## 🔧 Configuration

### API Configuration
The application is configured to connect to the backend at `http://localhost:8000`. This is set in:
- `src/services/api.js` - Axios base URL configuration
- `package.json` - Proxy configuration for development

### Environment Variables
Create a `.env` file in the frontend root for environment-specific variables:
```
REACT_APP_API_URL=http://localhost:8000
```

## 🔗 Backend Integration

Make sure the backend server is running on port 8000:
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the provided batch file:
```bash
cd backend
run.bat
```

## 🎨 Styling

- Global styles are in `src/App.css`
- Component-specific styles are in their respective CSS files
- Authentication styles are in `src/pages/Auth.css`
- Home page styles are in `src/pages/Home.css`
- Navbar styles are in `src/components/Navbar.css`

## 🔐 Authentication

The app uses JWT tokens for authentication:
- Tokens are stored in localStorage
- Protected routes redirect to login if not authenticated
- Automatic token validation on app load

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This creates a `build` folder with optimized production files.

### Deployment Options
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: AWS CloudFront, Cloudflare
- **Traditional Server**: Apache, Nginx

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Kill processes using port 3000: `npx kill-port 3000`
   - Or change the port: `PORT=3001 npm start`

2. **Module Not Found**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

3. **API Connection Issues**
   - Ensure backend is running on port 8000
   - Check CORS configuration in backend
   - Verify network connectivity

## 📞 Support

For issues related to:
- **Frontend**: Check this README and React documentation
- **Backend**: Refer to backend documentation
- **Database**: Check PostgreSQL and Neon documentation

---

**Note**: This project uses Create React App 5.0.1, which provides a solid foundation for React applications with built-in webpack, Babel, and development tools.