from django.core.mail import send_mail
from twilio.rest import Client

def send_appointment_email(to_email,message):
    send_mail(
        subject="Appointment Confiramtion",
        message=message,
        from_email="jeevae3112@gmail.com",
        recipient_list=[to_email],
        fail_silently=True,
    )

import os
from twilio.rest import Client

def send_sms(phone, message):
    print("📱 SMS FUNCTION CALLED")

    account_sid = os.getenv("TWILIO_SID")
    auth_token = os.getenv("TWILIO_TOKEN")
    from_phone = os.getenv("TWILIO_PHONE")

    client = Client(account_sid, auth_token)

    if not phone.startswith("+"):
        phone = "+91" + phone

    try:
        msg = client.messages.create(
            body=message,
            from_=from_phone,
            to=phone
        )
        print("✅ SMS SENT:", msg.sid)
    except Exception as e:
        print("❌ SMS ERROR:", e)

