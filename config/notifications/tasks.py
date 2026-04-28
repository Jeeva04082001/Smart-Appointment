from celery import shared_task
from notifications.utils import send_sms
from django.core.mail import send_mail
from django.conf import settings


# @shared_task
# def send_email_notification(email):
#     print(f"[CELERY] Sending EMAIL to {email}")




@shared_task
def send_email_notification(email):
    print(f"[CELERY] Sending EMAIL to {email}")

    try:
        send_mail(
            subject="Appointment Confirmation",
            message="Your appointment is booked successfully",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,  # 🔥 important
        )
        print("✅ EMAIL SENT")
    except Exception as e:
        print("❌ EMAIL ERROR:", e)

@shared_task
def send_sms_notification(phone):
    import os

    print("SID:", os.getenv("TWILIO_SID"))
    print("TOKEN:", os.getenv("TWILIO_TOKEN"))
    print("PHONE:", os.getenv("TWILIO_PHONE"))

    send_sms(phone, "Your appointment is booked")
    print(f"[CELERY] Sending SMS to {phone}")

@shared_task
def send_reminder(email, time):
    print(f"[CELERY] Reminder: Appointment at {time} for {email}")







