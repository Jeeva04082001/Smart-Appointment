from rest_framework import serializers

from .models import User

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
        return user

    def validate_role(self,value):
        if value not in ['ADMIN','DOCTOR','PATIENT']:
            raise serializers.ValidationError("Invalid role")
        return value













