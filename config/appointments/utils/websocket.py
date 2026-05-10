from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_appointment_update(appointment):

    channel_layer = get_channel_layer()

    # 🔥 patient check
    if not appointment.patient:
        return

    async_to_sync(channel_layer.group_send)(
        f"appointments_{appointment.patient.user.id if appointment.patient and appointment.patient.user else None}",
        {
            "type": "appointment_update",
            "data": {
                "status": appointment.status,
                "doctor": appointment.doctor.id,
                "doctor_name": appointment.doctor.doctor_name,
                "token": appointment.token_number,
            }
        }
    )