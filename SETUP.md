# Nexus Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd server && npm install && cd ..
```

### 2. Configure Environment Variables
Create `server/.env` with:
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/nexus
PORT=3001
JWT_SECRET=your_random_64_character_string_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get your keys:**
- MongoDB: https://www.mongodb.com/atlas (free tier available)
- Gemini API: https://aistudio.google.com/app/apikey (free tier available)

### 3. Run Development Server
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:5173 (Vite)
- **Backend**: http://localhost:3001 (Express)

## Troubleshooting

### 500 Error on Login
- Ensure `.env` is created in the `server/` folder
- Check `MONGODB_URI` is valid and MongoDB is accessible
- Run `npm install` in both root and server folders

### Database Connection Failed
- Verify MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas settings
- Test connection with `npm run dev` and check console logs

## Project Structure
- `src/` – React frontend
- `server/` – Express backend with routes, models, and sockets
- `public/` – Static assets
