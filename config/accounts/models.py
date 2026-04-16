from django.db import models
from django.contrib.auth.models import AbstractUser
# from appointments.models import *

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('DOCTOR', 'Doctor'),
        ('PATIENT', 'Patient'),
    )
    doctor_profile = models.OneToOneField(
        'appointments.DoctorProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=15, blank=True,null=True)

    def __str__(self):
        return f"{self.username} - {self.role}"

