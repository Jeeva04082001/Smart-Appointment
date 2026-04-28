from django.db import models
from django.conf import settings
from accounts.models import *

# User = settings.AUTH_USER_MODEL

class Specialization(models.Model):
    name = models.CharField(max_length=100, unique=True)
    class Meta:
        db_table = "Specialization"

   
    

class DoctorProfile(models.Model):
    # user = models.OneToOneField(User, on_delete=models.CASCADE,related_name="doctor_profile")
    specialization = models.ForeignKey(Specialization,on_delete=models.CASCADE,related_name="doctors")
    doctor_name = models.CharField(max_length=100, null=True, blank=True)
    experience = models.IntegerField()
    hospital_name = models.CharField(max_length=200)
    class Meta:
        db_table = "DoctorProfile"

    
   
    
class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
    day = models.CharField(max_length=10)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.IntegerField(default=15)
    class Meta:
        db_table = "DoctorAvailability"

class DoctorLeave(models.Model):
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
    date = models.DateField()
    class Meta:
        db_table = "DoctorLeave"

class Patient(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    email = models.EmailField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True)

    class Meta:
        db_table = "Patient"
    

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('BOOKED', 'Booked'),
        ('ARRIVED','Arrived'),
        ('IN_QUEUE', 'In Queue'),
        ('IN_CONSULTATION', 'In Consultation'),
        ('COMPLETED', 'Completed'),
        ('NO_SHOW', 'No Show'),
        ('CANCELLED', 'Cancelled'),

    )

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    date = models.DateField()
    token_number = models.IntegerField(null=True, blank=True)
    time_slot = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BOOKED')
    is_emergency = models.BooleanField(default=False)
    is_serving = models.BooleanField(default=False)
    is_walkin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['doctor', 'date', 'time_slot'],
                condition=models.Q(status='BOOKED'),
                name='unique_booking_per_slot'
            )
        ]
        db_table = "Appointment"



