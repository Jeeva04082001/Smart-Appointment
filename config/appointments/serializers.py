from rest_framework import serializers
from .models import Appointment

# class DoctorCreateSerializer(serializers.Serializer):
#     username = serializers.CharField()
#     password = serializers.CharField(write_only=True)
#     doctor_name = serializers.CharField()
#     specialization = serializers.CharField()
#     experience = serializers.CharField()
#     hospital_name = serializers.CharField()




class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'











