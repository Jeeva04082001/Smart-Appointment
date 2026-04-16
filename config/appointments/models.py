from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class DoctorProfile(models.Model):
    # user = models.OneToOneField(User, on_delete=models.CASCADE,related_name="doctor_profile")
    doctor_name = models.CharField(max_length=100, null=True, blank=True)
    specialization = models.CharField(max_length=100)
    experience = models.IntegerField()
    hospital_name = models.CharField(max_length=200)

    def __str__(self):
        return f"Dr. {self.doctor_name} - {self.specialization}"
    
class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
    day = models.CharField(max_length=10)
    start_time = models.TimeField()
    end_time = models.TimeField()

    

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('BOOKED', 'Booked'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    )

    # # 🔹 Doctor (must be a user with role DOCTOR)
    # doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments')

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)

    # 🔹 Logged-in patient (optional)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='patient_appointments')

    # 🔹 Guest patient details
    patient_name = models.CharField(max_length=100, null=True, blank=True)
    patient_phone = models.CharField(max_length=15, null=True, blank=True)
    patient_email = models.EmailField(null=True, blank=True)

    date = models.DateField()
    time_slot = models.TimeField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BOOKED')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} {self.time_slot} - Doctor {self.doctor}"
    
