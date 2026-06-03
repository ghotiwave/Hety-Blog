from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import init_db
from app.config import settings


def scheduled_digest_job():
    from app.database import SessionLocal
    from app.services.ai_digest import generate_daily_digest

    db = SessionLocal()
    try:
        generate_daily_digest(db)
    except Exception:
        pass
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_digest_job, "cron", hour=8, minute=0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Personal Blog API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving images
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
from app.routers import auth, posts, comments, scores, digests, profile_public, user_actions
from app.routers import admin_posts, admin_comments, admin_profile, admin_dashboard, admin_digests, upload

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(scores.router)
app.include_router(digests.router)
app.include_router(profile_public.router)
app.include_router(user_actions.router)
app.include_router(admin_posts.router)
app.include_router(admin_comments.router)
app.include_router(admin_profile.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_digests.router)
app.include_router(upload.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
