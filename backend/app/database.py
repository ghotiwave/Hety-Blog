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

        from app.config import settings
        if not db.query(User).filter(User.role == "admin").first():
            password = settings.ADMIN_PASSWORD.strip()
            username = settings.ADMIN_USERNAME.strip()
            if not password or password == "your-admin-password":
                raise RuntimeError(
                    "管理员密码未设置！请在项目根目录创建 .env 文件并设置 ADMIN_PASSWORD，"
                    "参考 .env.example。当前 ADMIN_PASSWORD 为空或仍为示例值。"
                )
            admin = User(
                username=username,
                password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
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
