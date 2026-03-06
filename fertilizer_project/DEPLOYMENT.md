# AgriAdvisor - Deployment Guide

A comprehensive fertilizer recommendation platform for farmers with admin management capabilities.

## 🌾 Features

- **Fertilizer Recommendations**: AI-powered crop and fertilizer suggestions
- **Role-Based Access**: Separate dashboards for Farmers and Admins
- **Admin Dashboard**: Manage users, articles, techniques, and view analytics
- **Farmer Dashboard**: Get recommendations, view weather, track yields
- **Content Management**: Admins can create/manage articles and farming techniques
- **Interactive UI**: Animated, agriculture-themed interface

---

## 📋 Prerequisites

- **Node.js** >= 18.x
- **Python** >= 3.9
- **MongoDB** (Atlas or local instance)
- **npm** or **yarn**

---

## 🚀 Quick Start (Development)

### 1. Backend Setup

```bash
cd fertilizer_project/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (create .env file)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agriadvisor
# JWT_SECRET=your-secret-key

# Run backend
uvicorn backend:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd fertilizer_project/frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your API URL
# VITE_API_URL=http://127.0.0.1:8000

# Run development server
npm run dev
```

### 3. Access Application

- **Frontend**: http://localhost:5176
- **Backend API**: http://127.0.0.1:8000
- **API Docs**: http://127.0.0.1:8000/docs

---

## 🔐 Default Admin Account

```
Email: admin@agriadvisor.com
Password: Admin@123
```

---

## 🌐 Production Deployment

### Frontend (Vercel)

1. **Connect Repository** to Vercel
2. **Set Build Settings**:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `fertilizer_project/frontend`

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   VITE_API_URL=https://your-backend-url.com
   ```

4. **Deploy** - Vercel will handle the rest

### Frontend (Manual Build)

```bash
cd fertilizer_project/frontend

# Set production API URL
echo "VITE_API_URL=https://your-backend-url.com" > .env.production

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to any static host
```

### Backend (Railway/Render/Heroku)

1. **Create new service** and connect repository

2. **Set environment variables**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agriadvisor
   JWT_SECRET=your-super-secret-jwt-key
   PORT=8000
   ```

3. **Set start command**:
   ```bash
   uvicorn backend:app --host 0.0.0.0 --port $PORT
   ```

4. **Deploy**

### Backend (Docker)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t agriadvisor-backend .
docker run -p 8000:8000 -e MONGODB_URI="your-uri" -e JWT_SECRET="your-secret" agriadvisor-backend
```

### MongoDB Atlas Setup

1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user with read/write access
3. Whitelist your server IP (or 0.0.0.0/0 for any)
4. Get connection string and set as `MONGODB_URI`

---

## 📁 Project Structure

```
fertilizer_project/
├── backend/
│   ├── backend.py        # FastAPI application
│   ├── requirements.txt  # Python dependencies
│   ├── articles.json     # Article seed data
│   └── techniques.json   # Technique seed data
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main application
│   │   ├── pages/        # Dashboard pages
│   │   ├── components/   # Reusable components
│   │   └── context/      # Auth context
│   ├── vercel.json       # Vercel configuration
│   └── vite.config.js    # Vite configuration
└── dataset/
    └── crop_yield.csv    # ML training data
```

---

## 🔧 Environment Variables

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://127.0.0.1:8000 |

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| MONGODB_URI | MongoDB connection string | mongodb+srv://... |
| JWT_SECRET | Secret key for JWT tokens | your-secret-key |
| PORT | Server port | 8000 |

---

## 🧪 Running Tests

```bash
# Backend tests
cd fertilizer_project
python test_auth.py
python test_recommendations.py
python test_dashboard_endpoints.py

# Frontend tests
cd frontend
npm test
```

---

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/me` - Get current user
- `GET /api/admin/users` - List all users (admin only)

### Articles
- `GET /api/articles` - List articles
- `POST /api/articles` - Create article (admin only)

### Techniques
- `GET /api/techniques` - List techniques
- `POST /api/techniques` - Create technique (admin only)

### Recommendations
- `POST /api/recommend` - Get fertilizer recommendation

---

## 🎨 Customization

### Theme Colors (App.css)
- Primary Green: `#2e7d32`
- Secondary Green: `#4caf50`
- Background: `#f5f5f5`
- Card Background: `#ffffff`

### Adding New Animations
Edit `AdminDashboard.css` and `FarmerDashboard.css` for dashboard-specific animations.

---

## 🆘 Troubleshooting

### CORS Issues
Ensure backend allows frontend origin in CORS settings.

### MongoDB Connection
- Check IP whitelist in Atlas
- Verify connection string format
- Ensure credentials are correct

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility

---

## 📄 License

MIT License - Feel free to use and modify for your projects.

---

## 👥 Support

For issues or questions, create an issue in the repository.
