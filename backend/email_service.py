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

def get_google_mail_webhook_url() -> str:
    """Optional Google Apps Script Webhook URL: sends directly via Gmail API over HTTPS (port 443) to ANY email address worldwide."""
    return os.getenv("GOOGLE_MAIL_WEBHOOK_URL", "").strip()

def get_brevo_api_key() -> str:
    """Optional Brevo REST API Key: sends over HTTPS (port 443) to any recipient globally without sandbox lock."""
    return os.getenv("BREVO_API_KEY", "").strip()

def get_smtp_host() -> str:
    return os.getenv("SMTP_HOST", "smtp.gmail.com").strip()

def get_smtp_port() -> int:
    try:
        return int(os.getenv("SMTP_PORT", "465").strip())
    except ValueError:
        return 465

def get_smtp_user() -> str:
    return os.getenv("SMTP_USER", "ujwalsingh164@gmail.com").strip()

def get_smtp_password() -> str:
    # Automatically strip spaces in case user pasted Google app password like "rbjd gpaf jvzw btve"
    pwd = os.getenv("SMTP_PASSWORD", "rbjdgpafjvzwbtve").replace(" ", "").strip()
    return pwd or "rbjdgpafjvzwbtve"

def get_smtp_from_email() -> str:
    user = get_smtp_user() or "ujwalsingh164@gmail.com"
    return os.getenv("SMTP_FROM_EMAIL", f"SecureCloud <{user}>").strip()

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

def _build_text_template(code: str, name: str = "") -> str:
    display_name = name or "User"
    return f"""Hello {display_name},

Your SecureCloud verification code is: {code}

Enter this 6-digit code to activate your encrypted storage vault. This code expires in 15 minutes.

If you did not request this verification, you can safely ignore this email.

--
SecureCloud Zero-Knowledge Storage
"""

async def _send_via_webhook(webhook_url: str, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """Dispatches email via Google Apps Script Webhook running on user's Gmail over HTTPS port 443 to ANY email address."""
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.post(
                webhook_url,
                json={
                    "to": to_email,
                    "subject": subject,
                    "html": html_content,
                    "text": text_content
                }
            )
            if resp.status_code in (200, 201, 302):
                logger.info(f"Email successfully delivered to {to_email} via Google Mail Webhook")
                return True
            else:
                logger.warning(f"Google Mail Webhook responded {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Failed sending via Google Mail Webhook: {e}")
    return False

async def _send_via_brevo(api_key: str, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """Dispatches email via Brevo REST API over HTTPS port 443 (supports sending to any email globally)."""
    try:
        sender_email = get_smtp_user() or "ujwalsingh164@gmail.com"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": {"name": "SecureCloud", "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content
                }
            )
            if resp.status_code in (200, 201):
                logger.info(f"Email successfully delivered to {to_email} via Brevo API")
                return True
            else:
                logger.warning(f"Brevo API error: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.warning(f"Failed sending via Brevo: {e}")
    return False

async def send_verification_email(to_email: str, code: str, user_name: str = "") -> bool:
    """
    Sends the 6-digit confirmation code via Webhook, Brevo, SMTP, or Resend.
    """
    html_content = _build_html_template(code, user_name)
    text_content = _build_text_template(code, user_name)
    subject = f"SecureCloud: Your Verification Code is {code}"

    # 1. Google Mail Webhook (Delivers to ANY recipient worldwide via Google's HTTPS infrastructure)
    webhook_url = get_google_mail_webhook_url()
    if webhook_url:
        ok = await _send_via_webhook(webhook_url, to_email, subject, html_content, text_content)
        if ok:
            return True

    # 2. Brevo API (Delivers to ANY recipient worldwide via REST over HTTPS)
    brevo_key = get_brevo_api_key()
    if brevo_key:
        ok = await _send_via_brevo(brevo_key, to_email, subject, html_content, text_content)
        if ok:
            return True

    # 3. Standard SMTP (Gmail App Password) with fast 3.5s timeout
    smtp_host = get_smtp_host()
    smtp_user = get_smtp_user()
    smtp_password = get_smtp_password()
    smtp_port = get_smtp_port()
    smtp_from = get_smtp_from_email()

    if smtp_host and smtp_user and smtp_password:
        try:
            def _send_smtp():
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_from
                msg["To"] = to_email
                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=3.5) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    try:
                        with smtplib.SMTP(smtp_host, smtp_port, timeout=3.5) as server:
                            server.starttls()
                            server.login(smtp_user, smtp_password)
                            server.send_message(msg)
                    except Exception:
                        with smtplib.SMTP_SSL(smtp_host, 465, timeout=3.5) as server:
                            server.login(smtp_user, smtp_password)
                            server.send_message(msg)

            await asyncio.to_thread(_send_smtp)
            logger.info(f"Verification email sent to {to_email} via SMTP ({smtp_host})")
            return True
        except Exception as e:
            logger.warning(f"SMTP delivery failed (likely port blocked by host): {e}")

    # 4. Resend API
    resend_api_key = get_resend_api_key()
    if resend_api_key:
        try:
            from_email = get_resend_from_email()
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": from_email,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                        "text": text_content
                    }
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Verification email sent to {to_email} via Resend")
                    return True
                else:
                    logger.warning(f"Resend rejected delivery to {to_email}: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.warning(f"Failed sending via Resend: {e}")

    logger.warning(f"Outbound email delivery could not be completed for {to_email}. Code {code} available in logs/admin console.")
    return False


async def send_password_otp_email(to_email: str, code: str, user_name: str = "", purpose: str = "Master Password Setup") -> bool:
    """
    Sends a 6-digit OTP to the user for setting or resetting their Master Account / Vault Password.
    """
    display_name = user_name or "SecureCloud User"
    subject = f"SecureCloud: Your {purpose} Security OTP is {code}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; color: #f3f4f6; margin: 0; padding: 40px 20px; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(0, 242, 254, 0.15); }}
        .logo {{ text-align: center; margin-bottom: 24px; }}
        .logo h1 {{ font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); color: #818cf8; font-size: 11px; font-weight: 600; font-family: monospace; text-transform: uppercase; margin-top: 8px; }}
        h2 {{ font-size: 20px; color: #ffffff; margin-top: 16px; margin-bottom: 8px; text-align: center; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; text-align: center; }}
        .otp-box {{ background: #050811; border: 2px dashed #818cf8; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; }}
        .otp-code {{ font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; }}
        .footer {{ font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <h1>SecureCloud</h1>
          <span class="badge">Cryptographic Key Access</span>
        </div>
        <h2>{purpose} Security OTP</h2>
        <p>Hello {display_name}, you requested a verification code to configure or reset your Master Account Password for the Zero-Knowledge Vault. This 6-digit OTP expires in 15 minutes.</p>
        <div class="otp-box">
          <div class="otp-code">{code}</div>
        </div>
        <p style="font-size: 12px; color: #f43f5e; font-weight: 600;">Never share this OTP with anyone. SecureCloud personnel will never ask for your password or OTP.</p>
        <div class="footer">
          &copy; 2026 SecureCloud Platform &bull; End-to-End Cryptographic Framework
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""Hello {display_name},

Your SecureCloud {purpose} security OTP is: {code}

Enter this 6-digit code in the SecureCloud Settings or Vault unlock screen to set or reset your master password. This OTP expires in 15 minutes.

Never share this code with anyone.

--
SecureCloud Zero-Knowledge Storage
"""

    # 1. Google Mail Webhook
    webhook_url = get_google_mail_webhook_url()
    if webhook_url:
        ok = await _send_via_webhook(webhook_url, to_email, subject, html_content, text_content)
        if ok:
            return True

    # 2. Brevo API
    brevo_key = get_brevo_api_key()
    if brevo_key:
        ok = await _send_via_brevo(brevo_key, to_email, subject, html_content, text_content)
        if ok:
            return True

    # 3. Standard SMTP (with 3.5s timeout)
    smtp_host = get_smtp_host()
    smtp_user = get_smtp_user()
    smtp_password = get_smtp_password()
    smtp_port = get_smtp_port()
    smtp_from = get_smtp_from_email()

    if smtp_host and smtp_user and smtp_password:
        try:
            def _send_smtp():
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_from
                msg["To"] = to_email
                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=3.5) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    try:
                        with smtplib.SMTP(smtp_host, smtp_port, timeout=3.5) as server:
                            server.starttls()
                            server.login(smtp_user, smtp_password)
                            server.send_message(msg)
                    except Exception:
                        with smtplib.SMTP_SSL(smtp_host, 465, timeout=3.5) as server:
                            server.login(smtp_user, smtp_password)
                            server.send_message(msg)

            await asyncio.to_thread(_send_smtp)
            logger.info(f"Password OTP email sent to {to_email} via SMTP ({smtp_host})")
            return True
        except Exception as e:
            logger.warning(f"SMTP delivery failed (likely port blocked by host): {e}")

    # 4. Resend API
    resend_api_key = get_resend_api_key()
    if resend_api_key:
        try:
            from_email = get_resend_from_email()
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": from_email,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                        "text": text_content
                    }
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Password OTP email sent to {to_email} via Resend")
                    return True
                else:
                    logger.warning(f"Resend rejected delivery to {to_email}: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.warning(f"Failed sending OTP via Resend: {e}")

    logger.warning(f"Outbound OTP email delivery could not be completed for {to_email}. Code {code} available in logs/admin console.")
    return False
