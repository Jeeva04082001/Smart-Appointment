from datetime import datetime, timedelta
from django.utils import timezone
from .models import Appointment
from notifications.utils import send_appointment_email, send_sms


def send_appointment_reminders():
    now = timezone.now()
    next_30_min = now + timedelta(minutes=30)

    appointments = Appointment.objects.filter(
        status='BOOKED',
        date=now.date()
    )

    for apt in appointments:
        appointment_datetime = datetime.combine(apt.date, apt.time_slot)
        appointment_datetime = timezone.make_aware(appointment_datetime)

        if now <= appointment_datetime <= next_30_min:

            # 🔥 Get contact
            if apt.patient:
                email = apt.patient.email
                phone = apt.patient.phone
                name = apt.patient.username
            else:
                email = apt.patient_email
                phone = apt.patient_phone
                name = apt.patient_name

            message = f"Reminder: Appointment at {apt.time_slot}"

            if email:
                send_appointment_email(email, message)

            if phone:
                send_sms(phone, message)

            print(f"Reminder sent to {name}")










# from datetime import datetime, timedelta
# from django.utils import timezone
# from .models import Appointment
# from notifications.utils import send_appointment_email, send_sms


# def send_appointment_reminders():
#     now = timezone.now()
#     next_30_min = now + timedelta(minutes=30)

#     appointments = Appointment.objects.filter(
#         status='BOOKED',
#         date=now.date(),
#         time_slot__gte=now.time(),
#         time_slot__lte=next_30_min.time()
#     )

#     for apt in appointments:

#         # 🔥 Get contact info
#         if apt.patient:
#             email = apt.patient.email
#             phone = apt.patient.phone
#             name = apt.patient.username
#         else:
#             email = apt.patient_email
#             phone = apt.patient_phone
#             name = apt.patient_name

#         message = f"Reminder: Appointment at {apt.time_slot}"

#         # ✅ Email
#         if email:
#             send_appointment_email(email, message)

#         # ✅ SMS
#         if phone:
#             send_sms(phone, message)

#         print(f"Reminder sent to {name}")







