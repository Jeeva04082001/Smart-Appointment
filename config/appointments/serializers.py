from rest_framework import serializers
from .models import *
from queue_management.models import Queue


# class DoctorCreateSerializer(serializers.Serializer):
#     username = serializers.CharField()
#     password = serializers.CharField(write_only=True)
#     doctor_name = serializers.CharField()
#     specialization = serializers.CharField()
#     experience = serializers.CharField()
#     hospital_name = serializers.CharField()




class AppointmentSerializer(serializers.ModelSerializer):
    token_number = serializers.IntegerField(source='queue.token_number', read_only=True)
    doctor_name = serializers.CharField(source='doctor.doctor_name', read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_phone = serializers.CharField(source="patient.phone", read_only=True)
    doctor_name = serializers.CharField(source="doctor.doctor_name", read_only=True)
    token_number = serializers.IntegerField(source='queue.token_number', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'

    # def get_token_number(self, obj):
    #     return obj.queue.token_number if hasattr(obj, 'queue') else None




class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = '__all__'


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = '__all__'




