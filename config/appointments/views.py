from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date, parse_time
from accounts.models import User
from notifications.utils import send_appointment_email, send_sms
from .serializers import AppointmentSerializer
from .models import Appointment, DoctorProfile,DoctorAvailability
from queue_management.models import Queue

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_doctor_profile(request):

    if request.user.role != "ADMIN":
        return Response({"error": "Only admin allowed"}, status=403)

    profile = DoctorProfile.objects.create(
        doctor_name = request.data.get("doctor_name"),
        specialization = request.data.get("specialization"),
        experience = request.data.get("experience"),
        hospital_name = request.data.get("hospital_name")
    )
    return Response({
        "message":"Doctor profile created",
        "doctor_id":profile.id
    })

print("USER TYPE:", type(User))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_doctor_user(request):

     # ✅ 1. Only ADMIN allowed
    if request.user.role != "ADMIN":
        return Response({"error": "Only admin can create doctor login"}, status=403)



    doctor_id = request.data.get("doctor_id")
    username=request.data.get("username")
    password=request.data.get("password")

    # ✅ 2. Validate input
    if not doctor_id or not username or not password:
        return Response({"error": "All fields required"}, status=400)
    

    try:
        doctor = DoctorProfile.objects.get(id=doctor_id)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

     # ✅ 4. Check doctor already linked
    if User.objects.filter(doctor_profile=doctor).exists():
        return Response({"error": "Doctor already has login"}, status=400)

    # ✅ 5. Check duplicate username
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)
    

    user = User.objects.create_user(
        username=username,
        password=password,
        role="DOCTOR",
        doctor_profile=doctor
    )

    return Response({
        "message": "Doctor login created",
        "doctor_id": doctor.id,
        "username": user.username
    },status=201)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_availability(request):

    # 🔥 ADMIN CHECK
    if request.user.role != "ADMIN":
        return Response({"error": "Only admin can create availability"}, status=403)



    doctor_id = request.data.get("doctor")
    day = request.data.get("day")
    start_time = request.data.get("start_time")
    end_time = request.data.get("end_time")

    try:
        doctor = DoctorProfile.objects.get(id=doctor_id)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

    if start_time >= end_time:
        return Response({"error": "Invalid time range"}, status=400)

    availability = DoctorAvailability.objects.create(
        doctor=doctor,
        day=day,
        start_time=start_time,
        end_time=end_time
    )

    return Response({
        "message": "Availability created successfully",
        "doctor": doctor_id,
        "day": day
    })


# print("USER TYPE:", User)
# print("USER TYPE REAL:", type(User))


@api_view(['POST'])
def book_appointment(request):

    doctor_id = request.data.get("doctor")
    date = request.data.get("date")
    time_slot = request.data.get("time_slot")

    # ✅ Validate doctor
    try:
        doctor = DoctorProfile.objects.get(id=doctor_id)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)
    
    doctor_user = User.objects.filter(doctor_profile=doctor).first()
    # ✅ Validate date/time
    if not date or not time_slot:
        return Response({"error": "Date and time required"}, status=400)

    date = parse_date(date)
    time_slot = parse_time(time_slot)

    if date < datetime.today().date():
        return Response({"error": "Cannot book past date"}, status=400)



    availability = DoctorAvailability.objects.filter(
        doctor=doctor,
        day=date.strftime("%A"),
        start_time__lte=time_slot,
        end_time__gte=time_slot
    ).exists()

    if not availability:
        return Response({"error": "Doctor not available at this time"}, status=400)

    # 🔥 Prevent double booking
    if Appointment.objects.filter(
        doctor=doctor,
        date=date,
        time_slot=time_slot,
        status='BOOKED'
    ).exists():
        return Response({"error": "Slot already booked"}, status=400)

    # ✅ Patient logic (Hybrid)
    if request.user.is_authenticated:
        patient = request.user
        patient_name = request.user.username
        patient_phone = request.user.phone
        patient_email = request.user.email

    else:
        patient = None
        patient_name = request.data.get("patient_name")
        patient_phone = request.data.get("patient_phone")
        patient_email = request.data.get("patient_email")

        if not patient_name or not patient_phone:
            return Response(
                {"error": "Guest name and phone required"},
                status=400
            )

    # ✅ Create appointment
    appointment = Appointment.objects.create(
        doctor=doctor,
        patient=patient,
        patient_name=patient_name,
        patient_phone=patient_phone,
        patient_email=patient_email,
        date=date,
        time_slot=time_slot
    )

    # 🔥 ===== QUEUE LOGIC START ===== 🔥

    last_token = Queue.objects.filter(
        appointment__doctor=doctor,
        appointment__date=date
    ).order_by('-token_number').first()

    if last_token:
        token_number = last_token.token_number + 1
    else:
        token_number = 1

    # ✅ Emergency flag (CORRECT WAY)
    # is_emergency = request.data.get("is_emergency", False)
    is_emergency = str(request.data.get("is_emergency", "false")).lower() == "true"



    queue = Queue.objects.create(
        appointment=appointment,
        token_number=token_number,
        is_emergency=is_emergency
    )

    try:
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f'queue_{doctor.id}',
            {
                "type": "send_queue_update",
                "data": {
                    "message": "New patient added",
                    "token": token_number
                }
            }
        )
    except Exception as e:
        print("WebSocket Error:", e)

    # # 🔥 Send email (if logged-in user)
    # if request.user.is_authenticated and request.user.email:
    #     send_appointment_email(
    #         request.user.email,
    #         f"Your appointment is booked. Token: {token_number}"
    #     )

    # # Guest SMS
    # if patient_phone:
    #     send_sms(patient_phone, f"Token: {token_number}")    

    # 🔥 Unified Notification System

    print("FINAL EMAIL:", patient_email)
    print("FINAL PHONE:", patient_phone)


    # doctor_user = None

    # if hasattr(doctor, 'user') and doctor.user:
    #     doctor_user = doctor.user

    # ✅ Send Email (both guest + logged-in)
    if patient_email:
        send_appointment_email(
            patient_email,
            f"Your appointment is booked with Dr. {doctor.doctor_name}. Token: {token_number}"
        )

    # ✅ Send SMS (both guest + logged-in)
    if patient_phone:
        send_sms(
            patient_phone,
            f"Appointment booked. Token: {token_number}"
        )

        # ✅ Doctor Email
    if doctor_user and doctor_user.email:
        send_appointment_email(
            doctor_user.email,
            f"New patient assigned.\nPatient: {patient_name}\nToken: {token_number}"
        )

    # ✅ Doctor SMS
    if doctor_user and doctor_user.phone:
        send_sms(
            doctor_user.phone,
            f"New patient assigned. Token: {token_number}"
        )


    # 🔥 ===== QUEUE LOGIC END ===== 🔥

    return Response({
        "message": "Appointment booked successfully",
        "appointment_id": appointment.id,
        "token_number": queue.token_number
    }, status=201)

    
   

# @api_view(['POST'])
# def book_appointment(request):
#     doctor_id = request.data.get("doctor")
#     date = request.data.get("date")
#     time_slot = request.data.get("time_slot")

#     # ✅ Validate doctor
#     try:
#         doctor = DoctorProfile.objects.get(id=doctor_id)
#     except DoctorProfile.DoesNotExist:
#         return Response({"error": "Doctor not found"}, status=404)

#     # ✅ Validate date/time
#     if not date or not time_slot:
#         return Response({"error": "Date and time required"}, status=400)

#     date = parse_date(date)
#     time_slot = parse_time(time_slot)

#     # 🔥 Prevent double booking
#     if Appointment.objects.filter(
#         doctor=doctor,
#         date=date,
#         time_slot=time_slot,
#         status='BOOKED'
#     ).exists():
#         return Response({"error": "Slot already booked"}, status=400)

#     # ✅ Patient logic (Hybrid)
#     if request.user.is_authenticated:
#         patient = request.user
#         patient_name = None
#         patient_phone = None
#     else:
#         patient = None
#         patient_name = request.data.get("patient_name")
#         patient_phone = request.data.get("patient_phone")

#         if not patient_name or not patient_phone:
#             return Response(
#                 {"error": "Guest name and phone required"},
#                 status=400
#             )

#     # ✅ Create appointment
#     appointment = Appointment.objects.create(
#         doctor=doctor,
#         patient=patient,
#         patient_name=patient_name,
#         patient_phone=patient_phone,
#         date=date,
#         time_slot=time_slot
#     )

#     return Response(AppointmentSerializer(appointment).data, status=201)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_appointments(request):
    user = request.user

    if user.role == "DOCTOR":
        # 🔥 get doctor's profile
        doctor = user.doctor_profile
        appointments = Appointment.objects.filter(doctor=doctor)
    else:
        appointments = Appointment.objects.filter(patient=user)

    return Response(AppointmentSerializer(appointments, many=True).data)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_appointment(request, pk):
    try:
        appointment = Appointment.objects.get(id=pk)
    except Appointment.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # only patient can cancel
    if request.user != appointment.patient:
        return Response({"error": "Not allowed"}, status=403)

    appointment.status = "CANCELLED"
    appointment.save()

    return Response({"message": "Appointment cancelled"})


# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def create_doctor(request):
#     if request.user.role != 'ADMIN':
#         return Response({"error": "Only dmin can create doctor"}, status=403)
    
#     serializer = DoctorCreateSerializer(data = request.data)

#     if not serializer.is_valid():
#         return Response(serializer.errors, status=400)

#     data = serializer.validated_data

#     if User.objects.filter(username = data['username']).exists():
#         return Response({"error": "Username already exists"}, status=400)


#     user = User.objects.create_user(
#         username=data['username'],
#         password=data['password'],
#         role='DOCTOR'
#     )

#     profile = DoctorProfile.objects.create(
#         user=user,
#         doctor_name=data['doctor_name'],
#         specialization = data['specialization'],
#         experience=data['experience'],
#         hospital_name=data['hospital_name']
#     )

#     return Response({
#         "message":"Doctor created successfully" ,
#         "doctor_id":profile.id,
#         "username":user.username
#     },status=201)













