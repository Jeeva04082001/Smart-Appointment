from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
# from .models import User
from appointments.models import *
from django.contrib.auth import get_user_model

User = get_user_model()



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username','password','role','phone','email']

    def create(self,validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data['role'],
            phone=validated_data.get('phone'),
            email=validated_data.get('email')
        )  

        if user.role == "PATIENT":
            Patient.objects.create(
                user=user,
                name=user.username,
                phone=user.phone,
                email=user.email
            )


        return user

    def validate_role(self,value):
        if value not in ['ADMIN','DOCTOR','PATIENT']:
            raise serializers.ValidationError("Invalid role")
        return value






class CustomTokenSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # ✅ Add role
        token['role'] = user.role
        token['username'] = user.username

        return token

    # 🔥 IMPORTANT (this sends role in response also)
    def validate(self, attrs):
        data = super().validate(attrs)

        data['role'] = self.user.role   # 👈 THIS IS KEY
        data['doctor_id'] = (
            self.user.doctor_profile.id
            if self.user.role == "DOCTOR" else None
        )

        # 🔥 ADD THIS BLOCK HERE 👇
        if self.user.role == "PATIENT":
            patient = Patient.objects.filter(user=self.user).first()
            data['patient_id'] = patient.id if patient else None
        else:
            data['patient_id'] = None



        return data






# class CustomTokenSerializer(TokenObtainPairSerializer):
#     @classmethod
#     def get_token(cls, user):
#         token = super().get_token(user)

#         # 🔥 Add custom fields
#         token['role'] = user.role
#         token['username'] = user.username

#         return token




