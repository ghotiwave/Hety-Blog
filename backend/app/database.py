from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Enable WAL mode and foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models.user import User
    from app.models.post import Post
    from app.models.comment import Comment
    from app.models.profile import Profile
    from app.models.score import Score
    from app.models.digest import NewsDigest
    from app.models.reading_history import ReadingHistory
    from app.models.like import Like
    from app.models.comment import Comment, CommentLike
    import bcrypt

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:

        if not db.query(User).filter(User.role == "admin").first():
            from app.config import settings
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=bcrypt.hashpw(settings.ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode(),
                role="admin",
            )
            db.add(admin)

        if not db.query(Profile).first():
            profile = Profile(
                id=1,
                name="Your Name",
                bio="Write something about yourself here.",
                interests="coding, reading, gaming",
                experience="Your experience here",
            )
            db.add(profile)

        db.commit()
    finally:
        db.close()
