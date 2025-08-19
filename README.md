# Computer Vision Demo Web App

This project is a full stack web application for identifying illegal or community standards-violating content in photos. It uses:

- **Frontend:** Next.js (TypeScript, Tailwind CSS)
- **Backend:** Python FastAPI
- **Database:** PostgreSQL
- **Cloud Vision:** Google Cloud Vision API

## Features
- Upload photos via web UI
- Analyze images for violations using Google Cloud Vision
- Store results and metadata in PostgreSQL
- View analysis results and upload history

## Getting Started

### Frontend
- Run `npm install` and `npm run dev` in the project root

### Backend
- Navigate to `backend/`
- Run `pip install -r requirements.txt`
- Start with `uvicorn main:app --reload`

### Environment Variables
- Configure PostgreSQL and Google Cloud Vision API keys in `backend/.env`

## License
MIT
