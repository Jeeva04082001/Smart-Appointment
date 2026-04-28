from django.db import models
from appointments.models import Appointment


class Queue(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE,related_name='queue')

    token_number = models.IntegerField()
    is_serving = models.BooleanField(default=False)
    is_emergency = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "Queue"