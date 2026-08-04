import unittest
from unittest.mock import AsyncMock, Mock, patch
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

import bcrypt
import httpx
from fastapi import HTTPException, Response, UploadFile
from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings, validate_runtime_settings
from app.database import Base
from app.models.comment import Comment, CommentLike
from app.models.digest import NewsDigest
from app.models.like import Like
from app.models.oauth_account import OAuthAccount
from app.models.post import Post
from app.models.profile import Profile
from app.models.reading_history import ReadingHistory
from app.models.score import Score
from app.models.user import User
from app.routers.auth import _client_ip, _login_attempts, _normalize_email, _validate_password, login, register
from app.routers.github_auth import github_callback
from app.routers.comments import _serialize, create_comment, delete_comment, list_replies
from app.routers.admin_dashboard import delete_user as delete_admin_user, list_comments as list_admin_comments
from app.routers.admin_digests import trigger_digest
from app.routers.admin_posts import export_post, import_post
from app.routers.upload import MAX_UPLOAD_BYTES, upload_image
from app.routers.user_actions import liked_posts, reading_history
from app.schemas.user import LoginRequest, RegisterRequest
from app.schemas.comment import CommentCreate
from app.schemas.post import PostResponse
from app.schemas.profile import ProfileUpdate
from app.utils.markdown_posts import (
    export_markdown_post,
    local_markdown_assets,
    parse_markdown_post,
    read_markdown_archive,
)
from app.utils.digest_slugs import assign_unique_digest_slugs, next_digest_slug
from app.utils.timestamps import beijing_isoformat, normalize_legacy_timestamps
from app.utils.guest_comments import (
    GUEST_COOKIE_NAME,
    _guest_comment_attempts,
    consume_guest_comment_limit,
    ensure_guest_comment_columns,
)
from app.services.ai_digest import has_digest_for_date
from app.services.email_service import store_code, verify_code
from app.services.news_fetcher import fetch_hackernews_top
from app.services.github_oauth import (
    GITHUB_STATE_COOKIE,
    GitHubFlowError,
    GitHubIdentity,
    _fetch_github_token,
    _oauth_client,
    create_github_authorization,
    exchange_github_identity,
    read_github_state,
    resolve_github_user,
    set_github_state_cookie,
)


class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()


class ConfigurationTests(unittest.TestCase):
    def test_default_or_short_jwt_secret_is_rejected(self):
        original_secret = settings.SECRET_KEY
        try:
            for insecure_secret in (
                "change-me-in-production",
                "replace-with-at-least-32-random-characters",
                "too-short",
            ):
                settings.SECRET_KEY = insecure_secret
                with self.assertRaises(RuntimeError):
                    validate_runtime_settings()
        finally:
            settings.SECRET_KEY = original_secret

    def test_partial_github_credentials_are_rejected(self):
        original = (
            settings.SECRET_KEY,
            settings.GITHUB_CLIENT_ID,
            settings.GITHUB_CLIENT_SECRET,
        )
        try:
            settings.SECRET_KEY = "s" * 32
            settings.GITHUB_CLIENT_ID = "client-id"
            settings.GITHUB_CLIENT_SECRET = ""
            with self.assertRaises(RuntimeError):
                validate_runtime_settings()
        finally:
            (
                settings.SECRET_KEY,
                settings.GITHUB_CLIENT_ID,
                settings.GITHUB_CLIENT_SECRET,
            ) = original

    def test_github_token_url_cannot_send_credentials_to_an_untrusted_host(self):
        original = (settings.SECRET_KEY, settings.GITHUB_TOKEN_URL)
        try:
            settings.SECRET_KEY = "s" * 32
            settings.GITHUB_TOKEN_URL = "https://example.com/login/oauth/access_token"
            with self.assertRaises(RuntimeError):
                validate_runtime_settings()
        finally:
            settings.SECRET_KEY, settings.GITHUB_TOKEN_URL = original

    def test_github_proxy_cannot_send_credentials_to_an_untrusted_host(self):
        original = (settings.SECRET_KEY, settings.GITHUB_PROXY_URL)
        try:
            settings.SECRET_KEY = "s" * 32
            settings.GITHUB_PROXY_URL = "http://blog-github:secret@proxy.example:7890"
            with self.assertRaises(RuntimeError):
                validate_runtime_settings()
        finally:
            settings.SECRET_KEY, settings.GITHUB_PROXY_URL = original


class LoginTests(DatabaseTestCase):
    def setUp(self):
        super().setUp()
        self.user = User(
            username="alice",
            email="Alice@Example.com",
            email_verified=1,
            password_hash=bcrypt.hashpw(b"pass123", bcrypt.gensalt()).decode(),
        )
        self.db.add(self.user)
        self.db.commit()

    def test_login_with_username_or_case_insensitive_email(self):
        request = SimpleNamespace(headers={}, client=SimpleNamespace(host="login-success"))
        by_name = login(request, LoginRequest(username="alice", password="pass123"), self.db)
        by_email = login(request, LoginRequest(username="alice@example.com", password="pass123"), self.db)
        self.assertEqual(by_name.user.id, self.user.id)
        self.assertEqual(by_email.user.id, self.user.id)

    def test_repeated_failed_login_is_rate_limited(self):
        request = SimpleNamespace(headers={}, client=SimpleNamespace(host="login-rate-limit"))
        req = LoginRequest(username="missing-user", password="wrong-password")
        key = "login-rate-limit:missing-user"
        _login_attempts.pop(key, None)
        try:
            for _ in range(10):
                with self.assertRaises(HTTPException) as failed:
                    login(request, req, self.db)
                self.assertEqual(failed.exception.status_code, 401)
            with self.assertRaises(HTTPException) as limited:
                login(request, req, self.db)
            self.assertEqual(limited.exception.status_code, 429)
        finally:
            _login_attempts.pop(key, None)


class RegistrationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    async def test_registration_normalizes_username_and_email(self):
        original_resend = settings.RESEND_API_KEY
        original_turnstile = settings.TURNSTILE_SECRET_KEY
        settings.RESEND_API_KEY = ""
        settings.TURNSTILE_SECRET_KEY = ""
        try:
            request = SimpleNamespace(client=SimpleNamespace(host="test-registration-normalize"))
            code = store_code("bob@example.com")
            result = await register(
                request,
                RegisterRequest(
                    username="  bob  ",
                    email="BOB@Example.com",
                    password="pass1234",
                    code=code,
                ),
                self.db,
            )
            self.assertEqual(result.user.username, "bob")
            self.assertEqual(result.user.email, "bob@example.com")
        finally:
            settings.RESEND_API_KEY = original_resend
            settings.TURNSTILE_SECRET_KEY = original_turnstile

    async def test_configured_turnstile_cannot_be_skipped(self):
        original_turnstile = settings.TURNSTILE_SECRET_KEY
        settings.TURNSTILE_SECRET_KEY = "configured-secret"
        try:
            request = SimpleNamespace(client=SimpleNamespace(host="test-turnstile-required"))
            with self.assertRaisesRegex(HTTPException, "人机验证"):
                await register(
                    request,
                    RegisterRequest(
                        username="charlie",
                        email="charlie@example.com",
                        password="pass1234",
                    ),
                    self.db,
                )
        finally:
            settings.TURNSTILE_SECRET_KEY = original_turnstile

    async def test_registration_never_skips_email_code_without_provider(self):
        original_resend = settings.RESEND_API_KEY
        original_turnstile = settings.TURNSTILE_SECRET_KEY
        settings.RESEND_API_KEY = ""
        settings.TURNSTILE_SECRET_KEY = ""
        try:
            request = SimpleNamespace(client=SimpleNamespace(host="test-registration-code-required"))
            with self.assertRaises(HTTPException) as raised:
                await register(
                    request,
                    RegisterRequest(
                        username="no-code",
                        email="no-code@example.com",
                        password="pass1234",
                    ),
                    self.db,
                )
            self.assertEqual(raised.exception.status_code, 400)
            self.assertIn("验证码", raised.exception.detail)
        finally:
            settings.RESEND_API_KEY = original_resend
            settings.TURNSTILE_SECRET_KEY = original_turnstile

    async def test_invalid_email_is_rejected_before_registration(self):
        with self.assertRaises(HTTPException) as raised:
            _normalize_email("not-an-email@localhost")
        self.assertEqual(raised.exception.status_code, 422)

    def test_client_ip_uses_first_valid_forwarded_address(self):
        request = SimpleNamespace(
            headers={"x-forwarded-for": "203.0.113.7, 172.18.0.2"},
            client=SimpleNamespace(host="172.18.0.3"),
        )
        self.assertEqual(_client_ip(request), "203.0.113.7")

    def test_password_policy_allows_unicode_and_respects_bcrypt_limit(self):
        self.assertEqual(_validate_password("安全密码123456"), "安全密码123456")
        with self.assertRaises(HTTPException):
            _validate_password("short7")
        with self.assertRaises(HTTPException):
            _validate_password("密" * 25)


class EmailCodeTests(unittest.TestCase):
    def test_generated_code_is_six_digits_and_single_use(self):
        email = "single-use@example.com"
        code = store_code(email)

        self.assertRegex(code, r"^\d{6}$")
        self.assertTrue(verify_code(email, code))
        self.assertFalse(verify_code(email, code))


class TimestampTests(unittest.TestCase):
    def test_beijing_isoformat_marks_naive_storage_with_offset(self):
        self.assertEqual(beijing_isoformat(datetime(2026, 8, 3, 9, 30)), "2026-08-03T09:30:00+08:00")
        self.assertEqual(
            beijing_isoformat(datetime(2026, 8, 3, 1, 30, tzinfo=timezone.utc)),
            "2026-08-03T09:30:00+08:00",
        )

    def test_legacy_timestamp_migration_is_atomic_and_idempotent(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO posts "
                    "(id, title, content, published, created_at, updated_at) "
                    "VALUES (1, 'old', 'body', 1, :old, :old), "
                    "(2, 'new', 'body', 1, :new, :new)"
                ),
                {"old": "2026-06-08 16:30:00.123456", "new": "2026-08-03 09:30:00.654321"},
            )

        self.assertEqual(normalize_legacy_timestamps(engine), 2)
        self.assertEqual(normalize_legacy_timestamps(engine), 0)
        with engine.connect() as connection:
            rows = connection.execute(
                text("SELECT id, created_at, updated_at FROM posts ORDER BY id")
            ).mappings().all()
        self.assertEqual(str(rows[0]["created_at"]), "2026-06-09 00:30:00.123456")
        self.assertEqual(str(rows[0]["updated_at"]), "2026-06-09 00:30:00.123456")
        self.assertEqual(str(rows[1]["created_at"]), "2026-08-03 09:30:00.654321")


class MarkdownTests(unittest.TestCase):
    def test_exported_article_can_be_imported(self):
        post = SimpleNamespace(
            title="往返测试",
            summary="摘要",
            tags="AI,设计",
            cover_image="/uploads/cover.jpg",
            post_type="blog",
            published=True,
            slug="round-trip",
            content="# 正文\n\n内容",
        )
        exported = export_markdown_post(post)
        imported = parse_markdown_post(exported.encode("utf-8"))
        self.assertEqual(imported.title, post.title)
        self.assertEqual(imported.tags, post.tags)
        self.assertEqual(imported.slug, post.slug)
        self.assertTrue(imported.published)
        self.assertTrue(imported.content.startswith("# 正文"))

    def test_plain_markdown_uses_first_h1_as_title(self):
        imported = parse_markdown_post("# 普通文章\n\n无需前置元数据。".encode("utf-8"), "ignored.md")
        self.assertEqual(imported.title, "普通文章")
        self.assertEqual(imported.post_type, "blog")
        self.assertFalse(imported.published)

    def test_plain_markdown_falls_back_to_filename_and_ignores_fenced_h1(self):
        raw = b"```md\n# code sample\n```\n\nBody without a heading."
        imported = parse_markdown_post(raw, "notes/fallback-title.markdown")
        self.assertEqual(imported.title, "fallback-title")

    def test_front_matter_without_title_uses_body_h1(self):
        imported = parse_markdown_post(b"---\ntags: [AI]\n---\n\n# Inferred title\n\nBody")
        self.assertEqual(imported.title, "Inferred title")
        self.assertEqual(imported.tags, "AI")

    def test_import_requires_a_title_source(self):
        with self.assertRaisesRegex(ValueError, "无法确定文章标题"):
            parse_markdown_post(b"Body without a heading.")

    def test_import_rejects_metadata_that_exceeds_database_limits(self):
        raw = f"---\ntitle: ok\nsummary: {'x' * 501}\n---\nbody".encode()
        with self.assertRaisesRegex(ValueError, "summary"):
            parse_markdown_post(raw)

    def test_local_images_are_detected_in_plain_markdown(self):
        imported = parse_markdown_post(
            b"---\ntitle: Local image\ncover_image: images/cover.png\n---\n\n![body](images/body.png)"
        )
        self.assertEqual(local_markdown_assets(imported), ["images/body.png", "images/cover.png"])

    def test_archive_rejects_unsafe_paths(self):
        output = BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            archive.writestr("article.md", "---\ntitle: Unsafe\n---\nbody")
            archive.writestr("../escape.png", b"image")
        with self.assertRaisesRegex(ValueError, "不安全"):
            read_markdown_archive(output.getvalue())


class MarkdownArchiveRouteTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    async def test_zip_import_and_export_round_trip_local_images(self):
        from PIL import Image

        image = BytesIO()
        Image.new("RGB", (6, 4), (30, 80, 160)).save(image, format="PNG")
        bundle = BytesIO()
        markdown = (
            "---\n"
            "title: 资源包测试\n"
            "slug: bundle-round-trip\n"
            "cover_image: assets/cover.png\n"
            "published: true\n"
            "---\n\n"
            "# 正文\n\n![本地图](assets/body.png)\n"
        )
        with zipfile.ZipFile(bundle, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("article.md", markdown.encode("utf-8"))
            archive.writestr("assets/cover.png", image.getvalue())
            archive.writestr("assets/body.png", image.getvalue())

        original_upload_dir = settings.UPLOAD_DIR
        try:
            with TemporaryDirectory() as upload_dir:
                settings.UPLOAD_DIR = upload_dir
                imported = await import_post(
                    UploadFile(filename="bundle.zip", file=BytesIO(bundle.getvalue())),
                    self.db,
                    SimpleNamespace(),
                )
                self.assertTrue(imported.cover_image.startswith("/uploads/"))
                self.assertIn("![本地图](/uploads/", imported.content)

                response = export_post(imported.id, self.db, SimpleNamespace())
                with zipfile.ZipFile(BytesIO(response.body)) as exported:
                    names = exported.namelist()
                    exported_markdown = exported.read("article.md").decode("utf-8")
                self.assertEqual(response.media_type, "application/zip")
                self.assertGreaterEqual(len([name for name in names if name.startswith("assets/")]), 2)
                self.assertIn("cover_image: assets/", exported_markdown)
                self.assertIn("![本地图](assets/", exported_markdown)
                self.assertNotIn("/uploads/", exported_markdown)
        finally:
            settings.UPLOAD_DIR = original_upload_dir

    async def test_plain_markdown_explains_how_to_import_local_images(self):
        raw = b"---\ntitle: Local\n---\n\n![image](assets/local.png)"
        with self.assertRaises(HTTPException) as raised:
            await import_post(
                UploadFile(filename="local.md", file=BytesIO(raw)),
                self.db,
                SimpleNamespace(),
            )
        self.assertEqual(raised.exception.status_code, 422)
        self.assertIn("ZIP", raised.exception.detail)


class SchemaTests(unittest.TestCase):
    def test_post_response_keeps_current_users_like_state(self):
        response = PostResponse(
            id=1,
            title="Post",
            content="Body",
            published=True,
            created_at="2026-08-02T00:00:00",
            updated_at="2026-08-02T00:00:00",
            user_liked=True,
        )
        self.assertTrue(response.model_dump()["user_liked"])

    def test_comment_content_is_trimmed_and_limited(self):
        self.assertEqual(CommentCreate(content="  hello  ").content, "hello")
        with self.assertRaises(ValidationError):
            CommentCreate(content=" ")
        with self.assertRaises(ValidationError):
            CommentCreate(content="x" * 5001)

    def test_guest_identity_fields_are_optional_and_normalized(self):
        request = CommentCreate(
            content="hello",
            guest_name="  visitor  ",
            guest_email=" Visitor@Example.com ",
        )
        self.assertEqual(request.guest_name, "visitor")
        self.assertEqual(request.guest_email, "visitor@example.com")
        self.assertIsNone(CommentCreate(content="hello", guest_name=" ").guest_name)
        with self.assertRaises(ValidationError):
            CommentCreate(content="hello", guest_email="not-an-email")

    def test_admin_profile_rejects_blank_name_and_oversized_urls(self):
        with self.assertRaises(ValidationError):
            ProfileUpdate(name="   ")
        with self.assertRaises(ValidationError):
            ProfileUpdate(github_url="x" * 501)


class CommentTests(DatabaseTestCase):
    def test_serialized_comment_contains_current_users_like_state(self):
        user = User(username="reader", password_hash="unused")
        post = Post(title="Post", content="Body", published=True)
        self.db.add_all([user, post])
        self.db.commit()
        comment = Comment(post_id=post.id, user_id=user.id, content="Comment")
        self.db.add(comment)
        self.db.commit()
        self.db.add(CommentLike(user_id=user.id, comment_id=comment.id))
        self.db.commit()

        serialized = _serialize(comment, self.db, user.id)
        self.assertTrue(serialized["user_liked"])

    def test_reply_endpoint_cannot_cross_post_boundaries(self):
        first = Post(title="First", content="Body", published=True)
        second = Post(title="Second", content="Body", published=True)
        self.db.add_all([first, second])
        self.db.commit()
        comment = Comment(post_id=first.id, content="Comment")
        self.db.add(comment)
        self.db.commit()

        with self.assertRaises(HTTPException) as raised:
            list_replies(second.id, comment.id, 1, self.db, None)
        self.assertEqual(raised.exception.status_code, 404)


class GuestCommentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.post = Post(title="Guest post", content="Body", published=True)
        self.db.add(self.post)
        self.db.commit()
        _guest_comment_attempts.clear()

    def tearDown(self):
        _guest_comment_attempts.clear()
        self.db.close()

    async def test_guest_comment_uses_private_email_and_signed_identity_cookie(self):
        original_turnstile = settings.TURNSTILE_SECRET_KEY
        settings.TURNSTILE_SECRET_KEY = ""
        try:
            request = SimpleNamespace(
                cookies={},
                headers={},
                client=SimpleNamespace(host="guest-comment"),
            )
            response = Response()
            created = await create_comment(
                self.post.id,
                CommentCreate(content="Guest message", guest_email="guest@example.com"),
                request,
                response,
                self.db,
                None,
            )
        finally:
            settings.TURNSTILE_SECRET_KEY = original_turnstile

        stored = self.db.get(Comment, created["id"])
        self.assertTrue(created["author_name"].startswith("Guest-"))
        self.assertEqual(created["author_role"], "guest")
        self.assertNotIn("guest_email", created)
        self.assertEqual(stored.guest_email, "guest@example.com")
        self.assertEqual(len(stored.guest_key_hash), 64)
        cookie = response.headers.get("set-cookie", "")
        self.assertIn(f"{GUEST_COOKIE_NAME}=", cookie)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=lax", cookie)

        admin_items = list_admin_comments(1, 20, self.db, SimpleNamespace())["items"]
        self.assertEqual(admin_items[0]["guest_email"], "guest@example.com")

    async def test_reply_to_guest_keeps_the_target_name(self):
        parent = Comment(post_id=self.post.id, guest_name="Visitor", content="Parent")
        author = User(username="member", password_hash="unused")
        self.db.add_all([parent, author])
        self.db.commit()
        response = Response()
        created = await create_comment(
            self.post.id,
            CommentCreate(content="Reply", parent_id=parent.id),
            SimpleNamespace(cookies={}, headers={}, client=SimpleNamespace(host="member")),
            response,
            self.db,
            author,
        )
        self.assertEqual(created["reply_to_name"], "Visitor")

    def test_deleting_root_comment_removes_its_replies(self):
        admin = User(username="admin", password_hash="unused", role="admin")
        root = Comment(post_id=self.post.id, guest_name="Visitor", content="Root")
        self.db.add_all([admin, root])
        self.db.commit()
        reply = Comment(
            post_id=self.post.id,
            user_id=admin.id,
            parent_id=root.id,
            content="Reply",
        )
        self.db.add(reply)
        self.db.commit()
        reply_id = reply.id

        delete_comment(self.post.id, root.id, self.db, admin)

        self.assertIsNone(self.db.get(Comment, root.id))
        self.assertIsNone(self.db.get(Comment, reply_id))

    async def test_configured_turnstile_is_required_for_guest_comments(self):
        original_turnstile = settings.TURNSTILE_SECRET_KEY
        settings.TURNSTILE_SECRET_KEY = "configured-secret"
        try:
            with self.assertRaises(HTTPException) as raised:
                await create_comment(
                    self.post.id,
                    CommentCreate(content="No captcha"),
                    SimpleNamespace(cookies={}, headers={}, client=SimpleNamespace(host="guest-captcha")),
                    Response(),
                    self.db,
                    None,
                )
            self.assertEqual(raised.exception.status_code, 400)
        finally:
            settings.TURNSTILE_SECRET_KEY = original_turnstile

    def test_guest_identity_rate_limit_is_enforced(self):
        for _ in range(5):
            consume_guest_comment_limit("203.0.113.20", "identity")
        with self.assertRaises(HTTPException) as raised:
            consume_guest_comment_limit("203.0.113.20", "identity")
        self.assertEqual(raised.exception.status_code, 429)

    def test_legacy_comment_table_migration_is_idempotent(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE comments (id INTEGER PRIMARY KEY, content TEXT NOT NULL)"))
        ensure_guest_comment_columns(engine)
        ensure_guest_comment_columns(engine)
        with engine.connect() as connection:
            columns = {row[1] for row in connection.execute(text("PRAGMA table_info(comments)"))}
        self.assertTrue({"guest_name", "guest_email", "guest_key_hash", "reply_to_name_override"} <= columns)


class GitHubOAuthTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.original = (
            settings.GITHUB_CLIENT_ID,
            settings.GITHUB_CLIENT_SECRET,
            settings.GITHUB_CALLBACK_URL,
            settings.GITHUB_PROXY_URL,
            settings.SITE_URL,
        )
        settings.GITHUB_CLIENT_ID = "client-id"
        settings.GITHUB_CLIENT_SECRET = "client-secret"
        settings.GITHUB_CALLBACK_URL = "https://blog.example/api/auth/github/callback"
        settings.GITHUB_PROXY_URL = "http://blog-github:test-password@172.17.0.1:7890"
        settings.SITE_URL = "https://blog.example"

    def tearDown(self):
        (
            settings.GITHUB_CLIENT_ID,
            settings.GITHUB_CLIENT_SECRET,
            settings.GITHUB_CALLBACK_URL,
            settings.GITHUB_PROXY_URL,
            settings.SITE_URL,
        ) = self.original
        self.db.close()

    async def test_authorization_uses_signed_state_cookie_and_pkce(self):
        authorization_url, state_token = await create_github_authorization("login")
        response = Response()
        set_github_state_cookie(response, state_token)
        cookie_value = response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]
        state = authorization_url.split("state=", 1)[1].split("&", 1)[0]
        request = SimpleNamespace(cookies={GITHUB_STATE_COOKIE: cookie_value})

        payload = read_github_state(request, state)

        self.assertEqual(payload["mode"], "login")
        self.assertIn("code_challenge=", authorization_url)
        self.assertIn("code_challenge_method=S256", authorization_url)
        self.assertIn("scope=read%3Auser+user%3Aemail", authorization_url)
        self.assertIn("HttpOnly", response.headers["set-cookie"])

    async def test_token_exchange_posts_github_client_credentials(self):
        async with _oauth_client() as client:
            self.assertEqual(client.token_endpoint_auth_method, "client_secret_post")

    def test_oauth_client_uses_only_the_explicit_github_proxy(self):
        with patch("app.services.github_oauth.AsyncOAuth2Client") as client_class:
            _oauth_client()

        kwargs = client_class.call_args.kwargs
        self.assertEqual(kwargs["proxy"], settings.GITHUB_PROXY_URL)
        self.assertFalse(kwargs["trust_env"])

    def test_new_github_identity_creates_linked_user(self):
        identity = GitHubIdentity("101", "octocat", "octocat@example.com", "https://avatar")

        user, result = resolve_github_user(self.db, identity, mode="login")

        self.assertEqual(result, "created")
        self.assertEqual(user.email, "octocat@example.com")
        self.assertEqual(user.email_verified, 1)
        self.assertTrue(user.password_hash.startswith("$2"))
        link = self.db.query(OAuthAccount).filter_by(user_id=user.id, provider="github").one()
        self.assertEqual(link.provider_user_id, "101")

    def test_linked_identity_logs_into_the_same_user(self):
        identity = GitHubIdentity("102", "linked-user", "linked@example.com")
        first, _ = resolve_github_user(self.db, identity, mode="login")

        second, result = resolve_github_user(self.db, identity, mode="login")

        self.assertEqual(result, "login")
        self.assertEqual(second.id, first.id)
        self.assertEqual(self.db.query(User).count(), 1)

    def test_matching_local_email_requires_explicit_binding(self):
        local = User(username="local", email="same@example.com", password_hash="unused")
        self.db.add(local)
        self.db.commit()

        with self.assertRaises(GitHubFlowError) as raised:
            resolve_github_user(
                self.db,
                GitHubIdentity("103", "same", "same@example.com"),
                mode="login",
            )

        self.assertEqual(raised.exception.code, "existing_email")
        self.assertEqual(self.db.query(OAuthAccount).count(), 0)

    def test_authenticated_user_can_bind_github_explicitly(self):
        local = User(username="local", email="local@example.com", password_hash="unused")
        self.db.add(local)
        self.db.commit()

        user, result = resolve_github_user(
            self.db,
            GitHubIdentity("104", "different", "different@example.com"),
            mode="bind",
            bind_user_id=local.id,
        )

        self.assertEqual(result, "bound")
        self.assertEqual(user.id, local.id)
        self.assertEqual(user.email, "local@example.com")
        self.assertEqual(self.db.query(OAuthAccount).filter_by(user_id=local.id).count(), 1)

    def test_github_identity_cannot_be_bound_to_two_users(self):
        first = User(username="first", email="first@example.com", password_hash="unused")
        second = User(username="second", email="second@example.com", password_hash="unused")
        self.db.add_all([first, second])
        self.db.commit()
        identity = GitHubIdentity("106", "shared", "shared@example.com")
        resolve_github_user(self.db, identity, mode="bind", bind_user_id=first.id)

        with self.assertRaises(GitHubFlowError) as raised:
            resolve_github_user(self.db, identity, mode="bind", bind_user_id=second.id)

        self.assertEqual(raised.exception.code, "account_conflict")

    def test_admin_user_deletion_removes_oauth_identity(self):
        admin = User(username="admin", password_hash="unused", role="admin")
        member = User(username="member", password_hash="unused")
        self.db.add_all([admin, member])
        self.db.commit()
        self.db.add(OAuthAccount(
            user_id=member.id,
            provider="github",
            provider_user_id="108",
            provider_username="member-gh",
        ))
        self.db.commit()

        delete_admin_user(member.id, self.db, admin)

        self.assertIsNone(self.db.get(User, member.id))
        self.assertEqual(self.db.query(OAuthAccount).count(), 0)

    async def test_exchange_selects_verified_primary_email(self):
        class FakeResponse:
            def __init__(self, data):
                self.data = data

            def raise_for_status(self):
                return None

            def json(self):
                return self.data

        class FakeClient:
            token = None

            def __init__(self):
                self.token_headers = None

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_):
                return None

            async def fetch_token(self, *_args, **kwargs):
                self.token_headers = kwargs.get("headers")
                return {"access_token": "discarded", "token_type": "bearer"}

            async def get(self, url, **_kwargs):
                if url.endswith("/user"):
                    return FakeResponse({"id": 107, "login": "email-user", "avatar_url": "https://avatar"})
                return FakeResponse([
                    {"email": "other@example.com", "verified": True, "primary": False},
                    {"email": "primary@example.com", "verified": True, "primary": True},
                ])

        fake_client = FakeClient()
        with patch("app.services.github_oauth._oauth_client", return_value=fake_client):
            identity = await exchange_github_identity("code", "state", "verifier")

        self.assertEqual(identity.provider_user_id, "107")
        self.assertEqual(identity.email, "primary@example.com")
        self.assertEqual(fake_client.token_headers, {"Accept": "application/json"})

    async def test_token_exchange_retries_one_connect_timeout(self):
        client = AsyncMock()
        client.fetch_token.side_effect = [
            httpx.ConnectTimeout("TLS handshake timed out"),
            {"access_token": "discarded", "token_type": "bearer"},
        ]

        token = await _fetch_github_token(client, "code", "verifier")

        self.assertEqual(token["access_token"], "discarded")
        self.assertEqual(client.fetch_token.await_count, 2)
        client.fetch_token.assert_awaited_with(
            settings.GITHUB_TOKEN_URL.strip(),
            code="code",
            code_verifier="verifier",
            headers={"Accept": "application/json"},
        )

    async def test_callback_returns_site_token_on_callback_origin(self):
        settings.SITE_URL = "https://gianniiss.top"
        authorization_url, state_token = await create_github_authorization("login")
        state = authorization_url.split("state=", 1)[1].split("&", 1)[0]
        request = SimpleNamespace(cookies={GITHUB_STATE_COOKIE: state_token})
        identity = GitHubIdentity("105", "callback-user", "callback@example.com")

        with patch(
            "app.routers.github_auth.exchange_github_identity",
            new=AsyncMock(return_value=identity),
        ):
            response = await github_callback(request, "temporary-code", state, None, self.db)

        self.assertEqual(response.status_code, 303)
        self.assertTrue(
            response.headers["location"].startswith(
                "https://blog.example/auth/github/complete#token="
            )
        )
        self.assertNotIn("temporary-code", response.headers["location"])

    async def test_callback_explains_github_connection_timeout(self):
        authorization_url, state_token = await create_github_authorization("login")
        state = authorization_url.split("state=", 1)[1].split("&", 1)[0]
        request = SimpleNamespace(cookies={GITHUB_STATE_COOKIE: state_token})

        with patch(
            "app.routers.github_auth.exchange_github_identity",
            new=AsyncMock(side_effect=httpx.ConnectTimeout("timeout")),
        ):
            response = await github_callback(request, "temporary-code", state, None, self.db)

        self.assertEqual(response.status_code, 303)
        self.assertIn("oauth_error=provider_unreachable", response.headers["location"])

class UserActionTests(DatabaseTestCase):
    def test_history_and_likes_totals_exclude_unpublished_posts(self):
        user = User(username="reader", password_hash="unused")
        visible = Post(title="Visible", content="Body", published=True)
        hidden = Post(title="Hidden", content="Body", published=False)
        self.db.add_all([user, visible, hidden])
        self.db.commit()
        self.db.add_all([
            ReadingHistory(user_id=user.id, post_id=visible.id),
            ReadingHistory(user_id=user.id, post_id=hidden.id),
            Like(user_id=user.id, post_id=visible.id),
            Like(user_id=user.id, post_id=hidden.id),
        ])
        self.db.commit()

        history = reading_history(1, 20, self.db, user)
        likes = liked_posts(1, 20, self.db, user)
        self.assertEqual(history["total"], 1)
        self.assertEqual([item["post_id"] for item in history["items"]], [visible.id])
        self.assertEqual(likes["total"], 1)
        self.assertEqual([item["post_id"] for item in likes["items"]], [visible.id])


class DigestSlugTests(DatabaseTestCase):
    def test_duplicate_historical_slugs_become_individually_addressable(self):
        older = SimpleNamespace(id=1, slug="2026-06-09", created_at=None)
        newer = SimpleNamespace(id=2, slug="2026-06-09", created_at=None)

        changed = assign_unique_digest_slugs([older, newer])

        self.assertEqual(changed, 1)
        self.assertEqual(newer.slug, "2026-06-09")
        self.assertEqual(older.slug, "2026-06-09-2")

    def test_next_slug_uses_first_free_suffix_instead_of_row_count(self):
        self.db.add_all([
            NewsDigest(title="One", content="Body", slug="2026-08-02"),
            NewsDigest(title="Three", content="Body", slug="2026-08-02-3"),
        ])
        self.db.commit()

        self.assertEqual(next_digest_slug(self.db, "2026-08-02"), "2026-08-02-2")

    def test_scheduler_can_detect_any_existing_version_for_the_day(self):
        self.db.add(NewsDigest(title="Two", content="Body", slug="2026-08-02-2"))
        self.db.commit()

        self.assertTrue(has_digest_for_date(self.db, "2026-08-02"))
        self.assertFalse(has_digest_for_date(self.db, "2026-08-03"))


class NewsFetcherTests(unittest.TestCase):
    @patch("app.services.news_fetcher.requests.get")
    def test_hacker_news_keeps_valid_items_when_one_detail_fails(self, mock_get):
        index = Mock()
        index.json.return_value = [101, 102]
        failed_detail = Mock()
        failed_detail.raise_for_status.side_effect = RuntimeError("temporary failure")
        valid_detail = Mock()
        valid_detail.json.return_value = {
            "title": "Working item",
            "url": "https://example.com/item",
            "score": 12,
            "descendants": 3,
        }
        mock_get.side_effect = [index, failed_detail, valid_detail]

        with self.assertLogs("app.services.news_fetcher", level="WARNING"):
            items = fetch_hackernews_top()

        self.assertEqual([item["title"] for item in items], ["Working item"])


class AdminDigestTests(unittest.TestCase):
    @patch("app.routers.admin_digests.generate_daily_digest")
    def test_generation_failure_is_logged_without_leaking_provider_details(self, generate):
        generate.side_effect = RuntimeError("provider-secret-detail")

        with self.assertLogs("app.routers.admin_digests", level="ERROR"):
            with self.assertRaises(HTTPException) as raised:
                trigger_digest(SimpleNamespace(), SimpleNamespace())

        self.assertEqual(raised.exception.status_code, 500)
        self.assertNotIn("provider-secret-detail", raised.exception.detail)


class UploadTests(unittest.IsolatedAsyncioTestCase):
    async def test_corrupt_image_is_rejected(self):
        file = UploadFile(filename="broken.jpg", file=BytesIO(b"not an image"))
        with self.assertRaises(HTTPException) as raised:
            await upload_image(file, SimpleNamespace())
        self.assertEqual(raised.exception.status_code, 400)

    async def test_oversized_image_is_rejected_before_processing(self):
        file = UploadFile(filename="large.jpg", file=BytesIO(b"x" * (MAX_UPLOAD_BYTES + 1)))
        with self.assertRaises(HTTPException) as raised:
            await upload_image(file, SimpleNamespace())
        self.assertEqual(raised.exception.status_code, 413)

    async def test_transparent_png_keeps_alpha_and_uses_real_image_format(self):
        from PIL import Image

        source = BytesIO()
        Image.new("RGBA", (4, 4), (255, 0, 0, 0)).save(source, format="PNG")
        original_upload_dir = settings.UPLOAD_DIR
        try:
            with TemporaryDirectory() as upload_dir:
                settings.UPLOAD_DIR = upload_dir
                file = UploadFile(filename="transparent.jpg", file=BytesIO(source.getvalue()))
                result = await upload_image(file, SimpleNamespace())
                self.assertTrue(result["url"].endswith(".webp"))
                saved = Path(upload_dir, result["url"].rsplit("/", 1)[-1])
                with Image.open(saved) as image:
                    self.assertEqual(image.format, "WEBP")
                    self.assertIn("A", image.getbands())
        finally:
            settings.UPLOAD_DIR = original_upload_dir


if __name__ == "__main__":
    unittest.main()
