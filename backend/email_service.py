import os
import secrets
import logging
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import httpx
import backend.config  # Ensures .env is loaded

logger = logging.getLogger("securecloud.email")

def get_resend_api_key() -> str:
    return os.getenv("RESEND_API_KEY", "").strip()

def get_resend_from_email() -> str:
    return os.getenv("RESEND_FROM_EMAIL", "SecureCloud <onboarding@resend.dev>").strip()

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)

def generate_verification_code() -> str:
    """Generate a cryptographically secure 6-digit verification OTP."""
    return f"{secrets.randbelow(900000) + 100000}"

def _build_html_template(code: str, name: str = "") -> str:
    display_name = name or "User"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; color: #f3f4f6; margin: 0; padding: 40px 20px; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(0, 242, 254, 0.15); }}
        .logo {{ text-align: center; margin-bottom: 24px; }}
        .logo h1 {{ font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.3); color: #00f2fe; font-size: 11px; font-weight: 600; font-family: monospace; text-transform: uppercase; margin-top: 8px; }}
        h2 {{ font-size: 20px; color: #ffffff; margin-top: 16px; margin-bottom: 8px; text-align: center; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; text-align: center; }}
        .otp-box {{ background: #050811; border: 2px dashed #00f2fe; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; }}
        .otp-code {{ font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00f2fe; }}
        .footer {{ font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #1e293b; pt-4; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <h1>SecureCloud</h1>
          <span class="badge">Zero-Knowledge Vault</span>
        </div>
        <h2>Verify Your Email Address</h2>
        <p>Hello {display_name}, enter this 6-digit confirmation code to activate your encrypted storage vault. This code expires in 15 minutes.</p>
        <div class="otp-box">
          <div class="otp-code">{code}</div>
        </div>
        <p style="font-size: 12px; color: #64748b;">If you did not request this verification, you can safely ignore this email.</p>
        <div class="footer">
          &copy; 2026 SecureCloud Platform &bull; End-to-End Cryptographic Framework
        </div>
      </div>
    </body>
    </html>
    """

async def send_verification_email(to_email: str, code: str, user_name: str = "") -> bool:
    """
    Sends the 6-digit confirmation code via Resend, SMTP, or logs to console as safety fallback.
    """
    html_content = _build_html_template(code, user_name)

    # 1. Try Resend API (Recommended)
    resend_api_key = get_resend_api_key()
    if resend_api_key:
        try:
            from_email = get_resend_from_email()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": from_email,
                        "to": [to_email],
                        "subject": f"Your SecureCloud Verification Code: {code}",
                        "html": html_content
                    }
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Verification email sent to {to_email} via Resend")
                    return True
                else:
                    logger.error(f"Resend API error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Failed sending via Resend: {e}")

    # 2. Try Standard SMTP (e.g. Gmail App Password)
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            def _send_smtp():
                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"Your SecureCloud Verification Code: {code}"
                msg["From"] = SMTP_FROM_EMAIL
                msg["To"] = to_email
                msg.attach(MIMEText(html_content, "html"))

                if SMTP_PORT == 465:
                    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                        server.starttls()
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.send_message(msg)

            await asyncio.to_thread(_send_smtp)
            logger.info(f"Verification email sent to {to_email} via SMTP")
            return True
        except Exception as e:
            logger.error(f"Failed sending via SMTP: {e}")

    # 3. Development / Safe Fallback: Log clearly so developer is never locked out
    logger.warning(
        f"\n=======================================================\n"
        f"[SECURECLOUD EMAIL VERIFICATION]\n"
        f"Recipient: {to_email}\n"
        f"6-Digit Code: {code}\n"
        f"Notice: Set RESEND_API_KEY or SMTP credentials in .env to deliver real inbox emails.\n"
        f"=======================================================\n"
    )
    print(f"\n>> [EMAIL VERIFICATION CODE for {to_email}]: {code}\n")
    return True
