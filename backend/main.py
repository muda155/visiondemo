from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from google.cloud import vision
from google.api_core.exceptions import GoogleAPIError
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

app = FastAPI()

# ---------------- Database setup (single source) ----------------
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "")
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}" if DB_PASS else f"postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ImageAnalysis(Base):
    __tablename__ = "image_analysis"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    adult = Column(Integer)
    spoof = Column(Integer)
    medical = Column(Integer)
    violence = Column(Integer)
    racy = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=True)

Base.metadata.create_all(bind=engine)

# ---------------- Dependency ----------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: hạn chế origin trong production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Helpers ----------------

def serialize_analysis(a: ImageAnalysis):
    return {
        "id": a.id,
        "filename": a.filename,
        "adult": a.adult,
        "spoof": a.spoof,
        "medical": a.medical,
        "violence": a.violence,
        "racy": a.racy,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
    }

# ---------------- Auth ----------------
security = HTTPBasic()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme123")

def require_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Basic"})
    return True

# ---------------- Endpoints ----------------

@app.get("/")
def read_root():
    return {"message": "FastAPI backend is running."}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="File rỗng hoặc không đọc được")
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.safe_search_detection(image=image)
        if response.error.message:
            raise HTTPException(status_code=502, detail=response.error.message)
        safe_search = response.safe_search_annotation
        result = {
            "adult": safe_search.adult,
            "spoof": safe_search.spoof,
            "medical": safe_search.medical,
            "violence": safe_search.violence,
            "racy": safe_search.racy,
        }
        analysis = ImageAnalysis(
            filename=file.filename,
            adult=safe_search.adult,
            spoof=safe_search.spoof,
            medical=safe_search.medical,
            violence=safe_search.violence,
            racy=safe_search.racy,
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return {"safe_search": result, "db_id": analysis.id}
    except GoogleAPIError as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=str(e))
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    try:
        analyses = db.query(ImageAnalysis).order_by(ImageAnalysis.timestamp.desc()).all()
        return [serialize_analysis(a) for a in analyses]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể truy vấn lịch sử: {e}")

@app.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(ImageAnalysis).filter(ImageAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    return serialize_analysis(analysis)

@app.delete("/analysis/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    analysis = db.query(ImageAnalysis).filter(ImageAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    db.delete(analysis)
    db.commit()
    return {"deleted": analysis_id}

# ---------------- Health / diagnostics ----------------
@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"database": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Gợi ý: Thêm endpoint /health/vision nếu cần kiểm tra Vision API
