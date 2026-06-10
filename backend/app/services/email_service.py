import random
import time
from app.config import settings

# In-memory code store: { email: (code, expiry_timestamp) }
_pending_codes: dict[str, tuple[str, float]] = {}

# Clean expired codes periodically
def _clean_expired():
    now = time.time()
    expired = [e for e, (_, t) in _pending_codes.items() if now > t]
    for e in expired:
        del _pending_codes[e]


def store_code(email: str) -> str:
    """Generate a 6-digit code and store it for 5 minutes."""
    _clean_expired()
    code = f"{random.randint(0, 999999):06d}"
    _pending_codes[email] = (code, time.time() + 300)
    return code


def verify_code(email: str, code: str) -> bool:
    """Check if the code is valid for this email. Consumed on success."""
    _clean_expired()
    stored = _pending_codes.get(email)
    if stored and stored[0] == code and time.time() < stored[1]:
        del _pending_codes[email]
        return True
    return False


def send_verification_code(to_email: str) -> bool:
    """Send a 6-digit verification code via Resend."""
    code = store_code(to_email)
    site = settings.SITE_NAME

    body = f"""<div style="font-family:sans-serif;max-width:400px;margin:0 auto">
      <h2>{site}</h2>
      <p>你的验证码是：</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;padding:16px;background:#f5f4f0;border-radius:8px;margin:16px 0">{code}</div>
      <p style="color:#999;font-size:14px">验证码 5 分钟内有效。如果你没有注册此账号，请忽略此邮件。</p>
    </div>"""

    if settings.RESEND_API_KEY:
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": f"{site} <noreply@{settings.SITE_DOMAIN}>",
                "to": [to_email],
                "subject": f"{site} - 邮箱验证码",
                "html": body,
            })
            return True
        except Exception:
            pass

    return False
