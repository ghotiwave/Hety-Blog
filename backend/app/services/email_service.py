from app.config import settings


def send_verification_email(to_email: str, token: str) -> bool:
    """Send verification email via Resend. Falls back to console output."""
    site = settings.SITE_NAME
    verify_url = f"{settings.SITE_URL}/api/auth/verify/{token}"
    body = f"<p>欢迎注册 {site}！</p><p>请点击以下链接验证你的邮箱：</p><p><a href=\"{verify_url}\">{verify_url}</a></p><p>如果你没有注册此账号，请忽略此邮件。</p>"

    # Try Resend API first
    if settings.RESEND_API_KEY:
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": f"{site} <noreply@{settings.SITE_DOMAIN}>",
                "to": [to_email],
                "subject": f"{site} - 邮箱验证",
                "html": body,
            })
            return True
        except Exception:
            pass

    return False
