from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date, parse_time
from notifications.utils import send_appointment_email, send_sms
from .serializers import *
from .models import *
from queue_management.models import Queue

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import date, datetime
from notifications.tasks import send_email_notification, send_reminder,send_sms_notification
from datetime import datetime, timedelta
from django.core.paginator import Paginator
from django.db.models import Case, When, Value, IntegerField, Prefetch
from accounts.models import User as CustomUser
from calendar import monthrange
from django.utils import timezone
from django.db import transaction



now = timezone.now()


# @api_view(['GET', 'POST'])
# @permission_classes([IsAuthenticated])
# def doctors(request):

#     # 🔹 GET → list doctors with pagination + filter
#     if request.method == 'GET':

#         doctors = DoctorProfile.objects.all()

#         # 🔍 FILTER (optional)
#         specialization = request.GET.get('specialization')
#         if specialization:
#             doctors = doctors.filter(specialization__icontains=specialization)

#         # 🔎 SEARCH (optional)
#         search = request.GET.get('search')
#         if search:
#             doctors = doctors.filter(doctor_name__icontains=search)

#         # 📄 PAGINATION
#         page = int(request.GET.get('page', 1))
#         limit = int(request.GET.get('limit', 5))

#         paginator = Paginator(doctors, limit)
#         page_obj = paginator.get_page(page)

#         data = []
#         for doctor in page_obj:
#             data.append({
#                 "id": doctor.id,
#                 "doctor_name": doctor.doctor_name,
#                 "specialization": doctor.specialization,
#                 "experience": doctor.experience,
#                 "hospital_name": doctor.hospital_name
#             })

#         return Response({
#             "total": paginator.count,
#             "page": page,
#             "total_pages": paginator.num_pages,
#             "doctors": data
#         })

#     # 🔹 POST → create doctor
#     if request.method == 'POST':

#         if request.user.role != "ADMIN":
#             return Response({"error": "Only admin allowed"}, status=403)

#         profile = DoctorProfile.objects.create(
#             doctor_name=request.data.get("doctor_name"),
#             specialization=request.data.get("specialization"),
#             experience=request.data.get("experience"),
#             hospital_name=request.data.get("hospital_name")
#         )

#         return Response({
#             "message": "Doctor profile created",
#             "doctor_id": profile.id
#         }, status=201)



@api_view(['GET'])
def get_specializations(request):
    spec=Specialization.objects.all()
    serializer = SpecializationSerializer(spec,many=True)
    return Response(serializer.data)
   

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_specialization(request):

    serializers=SpecializationSerializer(data=request.data)
    if serializers.is_valid():
        serializers.save()
        return Response(serializers.data)
    return Response(serializers.errors, status=400)

    


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_specialization(request,pk):
    try:
        spec = Specialization.objects.get(id=pk)
    except Specialization.DoesNotExist:
        return Response({"error": "Not found"},status=404)    

    serializer=SpecializationSerializer(spec,data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_specialization(request, pk):
    try:
        spec = Specialization.objects.get(id=pk)
    except Specialization.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    spec.delete()
    return Response({"message": "Deleted successfully"})




@api_view(['GET'])
@permission_classes([AllowAny])  # 🔥 allow guest + logged-in
def doctors(request):

    doctors = DoctorProfile.objects.all()

    # 🔍 FILTER
    specialization = request.GET.get('specialization')
    if specialization:
        doctors = doctors.filter(specialization__id=specialization)

    # 🔎 SEARCH
    search = request.GET.get('search')
    if search:
        doctors = doctors.filter(doctor_name__icontains=search)

    # 📄 PAGINATION
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 5))

    paginator = Paginator(doctors, limit)
    page_obj = paginator.get_page(page)

    data = [
        {
            "id": d.id,
            "doctor_name": d.doctor_name,
            "specialization": d.specialization.name,
            "specialization_id": d.specialization.id,
            "experience": d.experience,
            "hospital_name": d.hospital_name
        }
        for d in page_obj
    ]

    return Response({
        "total": paginator.count,
        "page": page,
        "total_pages": paginator.num_pages,
        "doctors": data
    })




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_doctor(request):

    if request.user.role != "ADMIN":
        return Response({"error": "Only admin allowed"}, status=403)

    doctor_id = request.data.get("id")  # 🔥 key logic

    spec_id = request.data.get("specialization")

    try:
        specialization = Specialization.objects.get(id=spec_id)
    except Specialization.DoesNotExist:
        return Response({"error": "Invalid specialization"}, status=400)

    # 🔥 UPDATE CASE
    if doctor_id:
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=404)

        doctor.doctor_name = request.data.get("doctor_name")
        doctor.specialization = specialization
        doctor.experience = request.data.get("experience")
        doctor.hospital_name = request.data.get("hospital_name")
        doctor.save()

        return Response({
            "message": "Doctor updated",
            "doctor_id": doctor.id
        })

    # 🔥 CREATE CASE
    doctor = DoctorProfile.objects.create(
        doctor_name=request.data.get("doctor_name"),
        specialization=specialization,
        experience=request.data.get("experience"),
        hospital_name=request.data.get("hospital_name")
    )

    return Response({
        "message": "Doctor created",
        "doctor_id": doctor.id
    })




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_doctor(request):

    if request.user.role != "ADMIN":
        return Response({"error": "Only admin allowed"}, status=403)

    spec_id = request.data.get("specialization")

    try:
        specialization = Specialization.objects.get(id=spec_id)
    except Specialization.DoesNotExist:
        return Response({"error": "Invalid specialization"}, status=400)


    profile = DoctorProfile.objects.create(
        doctor_name=request.data.get("doctor_name"),
        specialization=specialization,
        experience=request.data.get("experience"),
        hospital_name=request.data.get("hospital_name")
    )

    return Response({
        "message": "Doctor created",
        "doctor_id": profile.id
    })



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_detail(request, pk):

    try:
        doctor = DoctorProfile.objects.get(id=pk)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

    data = {
        "id": doctor.id,
        "doctor_name": doctor.doctor_name,
        "specialization": doctor.specialization.name,
        "specialization_id":doctor.specialization.id,
        "experience": doctor.experience,
        "hospital_name": doctor.hospital_name
    }

    return Response(data)



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
    if CustomUser.objects.filter(doctor_profile=doctor).exists():
        return Response({"error": "Doctor already has login"}, status=400)

    # ✅ 5. Check duplicate username
    if CustomUser.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)
    

    user = CustomUser.objects.create_user(
        username=username,
        password=password,
        role="DOCTOR",
        doctor_profile=doctor
        
    )

    return Response({
        "message": "Doctor login created",
        "doctor_id": doctor.id,
        "username": user.username,
        "has_login": CustomUser.objects.filter(doctor_profile=doctor).exists()
    },status=201)





@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_doctor(request, pk):

    if request.user.role != "ADMIN":
        return Response({"error": "Only admin allowed"}, status=403)

    try:
        doctor = DoctorProfile.objects.get(id=pk)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

    spec_id = request.data.get("specialization")

    try:
        specialization = Specialization.objects.get(id=spec_id)
    except Specialization.DoesNotExist:
        return Response({"error": "Invalid specialization"}, status=400)

    doctor.doctor_name = request.data.get("doctor_name")
    doctor.specialization = specialization
    doctor.experience = request.data.get("experience")
    doctor.hospital_name = request.data.get("hospital_name")
    doctor.save()

    return Response({"message": "Doctor updated"})



@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_doctor(request, pk):

    if request.user.role != "ADMIN":
        return Response({"error": "Only admin allowed"}, status=403)

    try:
        doctor = DoctorProfile.objects.get(id=pk)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

    try:
        doctor.delete()
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    return Response({"message": "Doctor deleted"})




# @api_view(['GET'])
# def get_slots(request, doctor_id):
#     date = request.GET.get("date")

#     if not date:
#         return Response({"error": "Date required"}, status=400)

#     date = parse_date(date)
#     if not date:
#         return Response({"error": "Invalid date"}, status=400)

#     try:
#         doctor = DoctorProfile.objects.get(id=doctor_id)
#     except DoctorProfile.DoesNotExist:
#         return Response({"error": "Doctor not found"}, status=404)

#     if DoctorLeave.objects.filter(doctor=doctor, date=date).exists():
#         return Response({"error": "Doctor not available (Leave)"}, status=400)

#     day_name = date.strftime("%A")
#     availability = DoctorAvailability.objects.filter(
#         doctor=doctor,
#         day=day_name
#     ).first()

#     if not availability:
#         return Response([])
    
#     total_slots = int(
#         (datetime.combine(date, availability.end_time) -
#         datetime.combine(date, availability.start_time)
#         ).total_seconds() / 60 / availability.slot_duration
#     )
    

#     slots = []
#     current = datetime.combine(date, availability.start_time)
#     end = datetime.combine(date, availability.end_time)

#     now = datetime.now()
#     next_given = False

#     while current < end:
#         slot_time = current.time()

#         # 🔥 FIX: skip past time (only for today)
#         if date == now.date() and current <= now:
#             current += timedelta(minutes=availability.slot_duration)
#             continue

#         booked_count = Appointment.objects.filter(
#             doctor=doctor,
#             date=date,
#             time_slot=slot_time,
#             status='BOOKED'
#         ).count()

#         available = 1 - booked_count  # assuming 1 per slot

#         # 🚀 next slot highlight
#         is_next = False
#         if not next_given and available > 0:
#             is_next = True
#             next_given = True

#         # 🚨 almost full
#         is_almost_full = available == 0

        
#         slots.append({
#             "time": slot_time.strftime("%H:%M"),
#             "available": max(available, 0),
#             "is_next": is_next if available > 0 else False,
#             "is_almost_full": available == 0,
#             "is_full": available <= 0
#         })

#         current += timedelta(minutes=availability.slot_duration)

#         # is_booked = Appointment.objects.filter(
#         #     doctor=doctor,
#         #     date=date,
#         #     time_slot=slot_time,
#         #     status='BOOKED'
#         # ).exists()

#         # if not is_booked:
#         #     slots.append(slot_time.strftime("%H:%M"))
#         #     # slots.append(str(slot_time))

#         # current += timedelta(minutes=availability.slot_duration)
#     return Response({
#         "total_slots": total_slots,
#         "slots": slots
#     })

#     # return Response(slots)



# @api_view(['GET'])
# def get_slots(request, doctor_id):
#     date = request.GET.get("date")

#     if not date:
#         return Response({"error": "Date required"}, status=400)

#     date = parse_date(date)
#     if not date:
#         return Response({"error": "Invalid date"}, status=400)

#     try:
#         doctor = DoctorProfile.objects.get(id=doctor_id)
#     except DoctorProfile.DoesNotExist:
#         return Response({"error": "Doctor not found"}, status=404)

#     # 🚫 Doctor leave check
#     if DoctorLeave.objects.filter(doctor=doctor, date=date).exists():
#         return Response({"error": "Doctor not available (Leave)"}, status=400)

#     # 📅 Convert date → day
#     day_name = date.strftime("%A")

#     availability = DoctorAvailability.objects.filter(
#         doctor=doctor,
#         day=day_name
#     ).order_by('start_time')

#     print(availability,'availability')

#     if not availability:
#         return Response([])

#     # 🧮 Total slots
#     total_slots = int(
#         (
#             datetime.combine(date, availability.end_time) -
#             datetime.combine(date, availability.start_time)
#         ).total_seconds() / 60 / availability.slot_duration
#     )

#     slots = []
#     current = datetime.combine(date, availability.start_time)
#     end = datetime.combine(date, availability.end_time)

#     now = datetime.now()
#     next_given = False

#     # 👉 capacity per slot (can upgrade later)
#     max_patients = getattr(availability, "max_patients", 1)

#     while current < end:
#         slot_time = current.time()

#         # ⏳ Skip past slots (only for today)
#         if date == now.date() and current <= now:
#             current += timedelta(minutes=availability.slot_duration)
#             continue

#         # 📊 Count booked
#         booked_count = Appointment.objects.filter(
#             doctor=doctor,
#             date=date,
#             time_slot=slot_time,
#             status='BOOKED'
#         ).count()

#         # 📊 Availability
#         available = max_patients - booked_count

#         # 🚦 Status flags
#         is_full = available <= 0
#         is_almost_full = (available == 1 and max_patients > 1)

#         # 🎯 Next available slot
#         is_next = False
#         if not next_given and available > 0:
#             is_next = True
#             next_given = True

#         slots.append({
#             "time": slot_time.strftime("%H:%M"),
#             "available": max(available, 0),
#             "is_next": is_next,
#             "is_full": is_full,
#             "is_almost_full": is_almost_full
#         })

#         current += timedelta(minutes=availability.slot_duration)

#     return Response({
#         "total_slots": total_slots,
#         "slots": slots
#     })



@api_view(['GET'])
def get_slots(request, doctor_id):
    date = request.GET.get("date")


    if not date:
        return Response({"error": "Date required"}, status=400)

    date = parse_date(date)
    if not date:
        return Response({"error": "Invalid date"}, status=400)

    try:
        doctor = DoctorProfile.objects.get(id=doctor_id)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

    # 🚫 Doctor leave check
    if DoctorLeave.objects.filter(doctor=doctor, date=date).exists():
        return Response({"error": "Doctor not available (Leave)"}, status=400)

    # 📅 Convert date → day
    day_name = date.strftime("%A")

    # 🔥 GET ALL AVAILABILITIES (IMPORTANT FIX)
    availabilities = DoctorAvailability.objects.filter(
        doctor=doctor,
        day=day_name
    ).order_by('start_time')

    print("DATE:", date)
    print("DAY:", day_name)
    print("AVAIL:", list(availabilities))

    if not availabilities.exists():
        return Response({
            "total_slots": 0,
            "slots": []
        })

    slots = []
    # now = datetime.now()
    now = timezone.now()
    next_given = False

    # 🔥 LOOP EACH AVAILABILITY
    for availability in availabilities:

        print(availability.start_time, availability.end_time)
        current = timezone.make_aware(datetime.combine(date, availability.start_time))
        end = timezone.make_aware(datetime.combine(date, availability.end_time))

        max_patients = getattr(availability, "max_patients", 1)

        while current < end:
            slot_time = current.time()

            # ⏳ Skip past slots
            if date == now.date() and current < now:
                current += timedelta(minutes=availability.slot_duration)
                continue

            booked_count = Appointment.objects.filter(
                doctor=doctor,
                date=date,
                time_slot=slot_time,
                status__in=['BOOKED','ARRIVED', 'IN_CONSULTATION']
            ).count()

            available = max_patients - booked_count

            is_full = available <= 0
            is_almost_full = (available == 1 and max_patients > 1)

            is_next = False
            if not next_given and available > 0:
                is_next = True
                next_given = True

            slots.append({
                "time": slot_time.strftime("%H:%M"),
                "available": max(available, 0),
                "is_next": is_next,
                "is_full": is_full,
                "is_almost_full": is_almost_full
            })

            current += timedelta(minutes=availability.slot_duration)

    # 🔥 SORT FINAL SLOTS (IMPORTANT)
    slots = sorted(slots, key=lambda x: x["time"])

    return Response({
        "total_slots": len(slots),
        "slots": slots
    })



def get_slots_logic(doctor, date):
    slots = []
    now = timezone.now()

    availabilities = DoctorAvailability.objects.filter(
        doctor=doctor,
        day=date.strftime("%A")
    ).order_by('start_time')

    next_given = False

    for availability in availabilities:
        current = timezone.make_aware(datetime.combine(date, availability.start_time))
        end = timezone.make_aware(datetime.combine(date, availability.end_time))

        max_patients = getattr(availability, "max_patients", 1)

        while current < end:
            slot_time = current.time()

            # ⏳ skip past
            if date == now.date() and current < now:
                current += timedelta(minutes=availability.slot_duration)
                continue

            booked = Appointment.objects.filter(
                doctor=doctor,
                date=date,
                time_slot=slot_time,
                status__in=['BOOKED','ARRIVED','IN_CONSULTATION']
            ).count()

            available = max_patients - booked

            is_next = False
            if not next_given and available > 0:
                is_next = True
                next_given = True

            slots.append({
                "time": slot_time.strftime("%H:%M"),
                "available": max(available, 0),
                "is_full": available <= 0,
                "is_next": is_next
            })

            current += timedelta(minutes=availability.slot_duration)

    return sorted(slots, key=lambda x: x["time"])


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
    slot_duration = request.data.get("slot_duration")

    if not slot_duration:
        return Response({"error": "slot_duration required"}, status=400)


    try:
        doctor = DoctorProfile.objects.get(id=doctor_id)
    except DoctorProfile.DoesNotExist:
        return Response({"error": "Doctor not found"}, status=404)

    if start_time >= end_time:
        return Response({"error": "Invalid time range"}, status=400)

    # if DoctorAvailability.objects.filter(
    #     doctor=doctor,
    #     day=day
    # ).exists():
    #     return Response({"error": f"{day} availability already exists for this doctor"}, status=400)


    if DoctorAvailability.objects.filter(
        doctor=doctor,
        day=day,
        start_time__lt=end_time,
        end_time__gt=start_time
    ).exists():
        return Response({
            "error": "Time overlaps with existing slot"
        }, status=400)

    availability = DoctorAvailability.objects.create(
        doctor=doctor,
        day=day,
        start_time=start_time,
        end_time=end_time,
        slot_duration=int(slot_duration)
    )

    return Response({
        "message": "Availability created successfully",
        "doctor": doctor_id,
        "day": day
    })





@api_view(['POST'])
def book_appointment(request):

    doctor_id = request.data.get("doctor")
    date = request.data.get("date")
    time_slot = request.data.get("time_slot")

    if not doctor_id or not date or not time_slot:
        return Response({"error": "Doctor, date and time required"}, status=400)

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

    
    if not date or not time_slot:
        return Response({"error": "Invalid date/time format"}, status=400)


    if date < timezone.now().date():
        return Response({"error": "Cannot book past date"}, status=400)

    
    # ✅ Patient logic (Hybrid)
    if request.user.is_authenticated and request.user.role == "PATIENT":
        patient, _ = Patient.objects.get_or_create(
            user=request.user,
            defaults={
                "name": request.user.username,
                "phone": request.user.phone,
                "email": request.user.email
            }
        )
    else:
        name = request.data.get("patient_name")
        phone = request.data.get("patient_phone")
        email = request.data.get("patient_email")
        age = request.data.get("age")
        gender = request.data.get("gender")


        if not name or not phone:
            return Response({"error": "Name & phone required"}, status=400)
        
        try:
            age = int(age) if age else None
        except ValueError:
            return Response({"error":"Invalid age"},status=400) 
           

        patient = Patient.objects.filter(
            name=name,
            phone=phone,
            age=age,
            gender=gender
        ).first()

        if not patient:
            patient=Patient.objects.create(
                name=name,
                phone=phone,
                email=email,
                age=age,
                gender=gender
            )
       




    day_name = date.strftime("%A")
    availability = DoctorAvailability.objects.filter(
        doctor=doctor,
        day=day_name,
        start_time__lte=time_slot,
        end_time__gte=time_slot
    ).exists()

    if not availability:
        return Response({"error": "Doctor not available at this time"}, status=400)

    availabilities = DoctorAvailability.objects.filter(
        doctor=doctor,
        day=day_name
    )

    if not availabilities.exists():
        return Response({"error": "No availability found"}, status=400)
    
    now = timezone.now()
    valid_slots = []
    
    for availability in availabilities:
        if not availability.slot_duration:
            continue

        duration = int(availability.slot_duration)
        current = timezone.make_aware(datetime.combine(date, availability.start_time))
        end = timezone.make_aware(datetime.combine(date, availability.end_time))

        while current < end:

            if date == now.date() and current < now:
                current += timedelta(minutes=duration)
                continue

            valid_slots.append(current.time().strftime("%H:%M"))
            current += timedelta(minutes=duration)

    time_slot_str = time_slot.strftime("%H:%M")
    if time_slot_str not in valid_slots:
        return Response({"error": "Invalid slot selected"}, status=400)

    

    # 🔥 Prevent double booking
    if Appointment.objects.filter(
        doctor=doctor,
        date=date,
        time_slot=time_slot,
        status='BOOKED'
    ).exists():
        return Response({"error": "Slot already booked"}, status=400)

    if Appointment.objects.filter(
        patient=patient,
        doctor=doctor,
        date=date,
        status="BOOKED"
    ).exists():
        return Response({"error": "You already booked this doctor today"}, status=400)


    if Appointment.objects.filter(
        patient=patient,
        date=date,
        time_slot=time_slot,
        status="BOOKED"
    ).exists():
        return Response({"error": "You already have another appointment at this time"}, status=400)

    if Appointment.objects.filter(
        patient=patient,
        date=date,
        status="BOOKED"
    ).count() >= 3:
        return Response({"error": "Maximum 3 appointments allowed per day"}, status=400)

    

    with transaction.atomic():
        last_token = Queue.objects.select_for_update().filter(
            appointment__doctor=doctor,
            appointment__date=date
        ).order_by('-token_number').first()

        token_number = last_token.token_number + 1 if last_token else 1

        is_walkin = not (
            request.user.is_authenticated and request.user.role == "PATIENT"
        )

        Appointment.objects.select_for_update().filter(
            doctor=doctor,
            date=date,
            time_slot=time_slot
        )

        if Appointment.objects.filter(
            doctor=doctor,
            date=date,
            time_slot=time_slot,
            status__in=['BOOKED','ARRIVED','IN_CONSULTATION']
        ).exists():
            return Response({"error":"Slot already booked"},status=400)

        

        # ✅ Create appointment
        appointment = Appointment.objects.create(
            doctor=doctor,
            patient=patient,
            date=date,
            time_slot=time_slot,
            token_number=token_number,
            is_walkin=is_walkin
        )

        is_emergency = str(request.data.get("is_emergency", "false")).lower() == "true"
        queue = Queue.objects.create(
            appointment=appointment,
            token_number=token_number,
            is_emergency=is_emergency
        )



    patient_email = patient.email
    patient_phone = patient.phone
    patient_name = patient.name



    # Combine date + time
    appointment_datetime = datetime.combine(date, time_slot)

    # Reminder 1 hour before
    reminder_time = appointment_datetime - timedelta(hours=1)

    # 🔥 Schedule reminder using Celery
    if patient_email:
        send_reminder.apply_async(
            args=[patient_email, str(appointment_datetime)],
            eta=reminder_time
        )

    print("FINAL EMAIL:", patient_email)
    print("FINAL PHONE:", patient_phone)



    # 🔥 ASYNC EMAIL (Celery)
    if patient_email:
        send_email_notification.delay(patient_email)

    # 🔥 ASYNC SMS (Celery)
    if patient_phone and len(patient_phone) >= 10:
        send_sms_notification.delay(patient_phone)

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
        
    try:

        channel_layer = get_channel_layer()

        queue_qs=Queue.objects.filter(
            appointment__doctor=doctor,
            appointment__date = date,
            appointment__status="ARRIVED"
        ).order_by('-is_emergency','token_number')


        data=[
            {
                "id":q.id,
                "token":q.token_number,
                "date":str(q.appointment.date),
                "patient":q.appointment.patient.name  if q.appointment.patient else "Guest",
                "is_serving":q.is_serving,
                "is_emergency":q.is_emergency,
                "appointment_id":q.appointment.id

            }
            for q in queue_qs
        ]


        async_to_sync(channel_layer.group_send)(
            f'queue_{doctor.id}',
            {
                "type": "send_queue_update",
                "data": data
            }
        )

        slots = get_slots_logic(doctor, date)

        async_to_sync(channel_layer.group_send)(
            f"slots_{doctor.id}",
            {
                "type": "send_slots_update",
                "data": slots
            }
        )


    except Exception as e:
        print("WebSocket Error:", e)

    


    return Response({
        "message": "Appointment booked successfully",
        "appointment_id": appointment.id,
        "token_number": queue.token_number
    }, status=201)




@api_view(['POST'])
def mark_arrived(request, id):
    try:
        appointment = Appointment.objects.get(id=id)
        appointment.status = "ARRIVED"
        appointment.save()

        # 🔥 SEND QUEUE UPDATE (VERY IMPORTANT)
        doctor = appointment.doctor

        channel_layer = get_channel_layer()

        queue_qs = Queue.objects.filter(
            appointment__doctor=doctor,
            appointment__date=appointment.date,
            appointment__status='ARRIVED'
        ).order_by('-is_emergency', 'token_number')

        data = [
            {
                "id": q.id,
                "token": q.token_number,
                "date": str(q.appointment.date),
                "patient": q.appointment.patient.name,
                "is_serving": q.is_serving,
                "is_emergency": q.is_emergency,
                "appointment_id": q.appointment.id
            }
            for q in queue_qs
        ]

        
        async_to_sync(channel_layer.group_send)(
            f'queue_{doctor.id}',
            {
                "type": "send_queue_update",
                "data": data
            }
        )

        slots = get_slots_logic(doctor, appointment.date)

        async_to_sync(channel_layer.group_send)(
            f"slots_{doctor.id}",
            {
                "type": "send_slots_update",
                "data": slots
            }
        )

        return Response({"message": "Patient marked as ARRIVED"})

    except Appointment.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    


@api_view(['POST'])
def complete_appointment(request, pk):
    try:
        apt = Appointment.objects.get(id=pk)
    except Appointment.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    apt.status = "COMPLETED"
    # apt.is_serving = False
    apt.save()

    # ✅ FIX: update queue instead of appointment
    Queue.objects.filter(appointment=apt).update(is_serving=False)

    channel_layer = get_channel_layer()


    slots = get_slots_logic(apt.doctor, apt.date)

    async_to_sync(channel_layer.group_send)(
        f"slots_{apt.doctor.id}",
        {
            "type": "send_slots_update",
            "data": slots
        }
    )

    return Response({"message": "Completed"})





@api_view(['POST'])
def mark_no_show(request, appointment_id):
    apt = Appointment.objects.get(id=appointment_id)

    apt.status = "NO_SHOW"
    apt.save()

    return Response({"message": "Marked as no-show"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_appointments(request):
    user = request.user

    queryset = Queue.objects.all()

    if user.role == "PATIENT":
        patient = Patient.objects.filter(user=user).first()

        if not patient:
            return Response({"error": "Patient not found"}, status=404)

        appointments = Appointment.objects.filter(patient=patient)

    elif user.role == "DOCTOR":
        # 🔥 get doctor's profile
        doctor = user.doctor_profile
        appointments = Appointment.objects.filter(doctor=doctor)
    else:  # ADMIN
        appointments = Appointment.objects.all()

    # else:
    #     patient = Patient.objects.filter(user=user).first()

    #     if not patient:
    #         return Response({"error": "Patient not found"}, status=404)
        
    #     appointments = Appointment.objects.filter(patient=user)

    appointments = appointments.annotate(
        status_order=Case(
            When(status='BOOKED',then=Value(1)),
            When(status='COMPLETED',then=Value(2)),
            When(status='CANCELLED',then=Value(3)),
            default=Value(4),
            output_field=IntegerField(),
        )
    ).order_by('status_order', 'date','time_slot','-created_at')    

    return Response(AppointmentSerializer(appointments, many=True).data)



@api_view(['POST','PATCH'])
@permission_classes([IsAuthenticated])
def cancel_appointment(request, pk):
    try:
        appointment = Appointment.objects.get(id=pk)
    except Appointment.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # 🔥 FIXED PERMISSION (IMPORTANT)
    if not appointment.patient.user or request.user != appointment.patient.user:
        return Response({"error": "Not allowed"}, status=403)

    doctor_id = appointment.doctor.id
    today = now().date()

    # 🔥 CHECK IF CURRENTLY SERVING
    was_serving = Queue.objects.filter(
        appointment=appointment,
        is_serving=True
    ).exists()

    # 🔥 UPDATE STATUS
    appointment.status = "CANCELLED"
    appointment.save()

    # 🔥 REMOVE FROM QUEUE
    Queue.objects.filter(appointment=appointment).delete()

    # 🔥 MOVE TO NEXT PATIENT
    if was_serving:
        next_q = Queue.objects.filter(
            appointment__doctor_id=doctor_id,
            appointment__status='ARRIVED',
            appointment__date=today
        ).order_by('-is_emergency', 'token_number').first()

        if next_q:
            next_q.is_serving = True
            next_q.save()

    # 🔥 GET UPDATED QUEUE
    queue = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status='ARRIVED',
        appointment__date=today
    ).order_by('-is_emergency', 'token_number')

    data = [
        {
            "id": q.id,
            "token": q.token_number,
            "patient": q.appointment.patient.name,  # ✅ FIXED
            "is_serving": q.is_serving,
            "appointment_id": q.appointment.id
        }
        for q in queue
    ]

    # 🔥 SEND REAL-TIME UPDATE
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f'queue_{doctor_id}',
        {
            "type": "send_queue_update",
            "data": data
        }
    )

    return Response({"message": "Appointment cancelled"})


@api_view(['GET'])
def admin_dashboard(request):
    today = date.today()

    data = {
        "total": Appointment.objects.filter(date=today).count(),
        "completed": Appointment.objects.filter(date=today, status="COMPLETED").count(),
        "waiting": Appointment.objects.filter(date=today, status="ARRIVED").count(),
        "no_show": Appointment.objects.filter(date=today, status="NO_SHOW").count(),
        "emergency": Appointment.objects.filter(date=today, is_emergency=True).count(),
    }

    return Response(data)



@api_view(['GET'])
def today_appointments(request):
    today = date.today()
    data = Appointment.objects.filter(date=today)

    result = [
        {
            "id": a.id,
            "token_number": a.token_number,
            "patient_name": a.patient.name,
            "status": a.status,
            "is_emergency": a.is_emergency
        }
        for a in data
    ]

    return Response(result)

@api_view(['POST'])
def create_leave(request):
    DoctorLeave.objects.create(
        doctor_id=request.data.get("doctor"),
        date=request.data.get("date")
    )
    return Response({"message": "Leave added"})


@api_view(['GET'])
def get_leaves(request, doctor_id):
    leaves = DoctorLeave.objects.filter(doctor_id=doctor_id)
    return Response({
        "leaves": [l.date for l in leaves]
    })



@api_view(['GET'])
def monthly_summary(request, doctor_id):
    month_str = request.GET.get("month")

    if not month_str:
        return Response({"error": "Month parameter required"}, status=400)

    try:
        year, month = map(int, month_str.split("-"))
    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM"}, status=400)

    total_days = monthrange(year, month)[1]
    data = {}
    # now = datetime.now()
    now = timezone.now()

    

    # ✅ Fetch all leaves for this doctor in one query
    leave_dates = set(
        DoctorLeave.objects.filter(
            doctor_id=doctor_id,
            date__year=year,
            date__month=month
        ).values_list('date', flat=True)
    )

    doctor = DoctorProfile.objects.get(id=doctor_id)
    # ✅ Fetch all booked appointments for this month in one query
    appointments = Appointment.objects.filter(
        doctor=doctor,
        date__year=year,
        date__month=month,
        status__in=['BOOKED','ARRIVED', 'IN_CONSULTATION']
    ).values('date', 'time_slot')

    # Build booked_map: { date: { time_slot: count } }
   
    # Rebuild correctly
    booked_map = {}
    for apt in appointments:
        d = apt['date']
        t = apt['time_slot']
        if d not in booked_map:
            booked_map[d] = {}
        booked_map[d][t] = booked_map[d].get(t, 0) + 1

    for day in range(1, total_days + 1):
        date = datetime(year, month, day).date()

        
        # ✅ Check leave
        if date in leave_dates:
            data[str(date)] = {"status": "leave", "available": 0}
            continue

        day_name = date.strftime("%A")
        availabilities = DoctorAvailability.objects.filter(
            doctor_id=doctor_id,
            day=day_name
        )

        if not availabilities.exists():
            data[str(date)] = {"status": "empty", "available": 0}
            continue

        total_available = 0
        total_slots = 0
        day_booked = booked_map.get(date, {})

        for a in availabilities:
            current = timezone.make_aware(datetime.combine(date, a.start_time))
            end = timezone.make_aware(datetime.combine(date, a.end_time))
            max_patients = getattr(a, "max_patients", 1)

            while current < end:
                slot_time = current.time()

                # ✅ Skip past slots for today (same logic as get_slots)
                if date == now.date() and current < now:
                    current += timedelta(minutes=a.slot_duration)
                    continue

                booked = day_booked.get(slot_time, 0)
                available = max_patients - booked

                total_slots += max_patients
                total_available += max(available, 0)

                current += timedelta(minutes=a.slot_duration)

        # ✅ Determine status
        if total_slots == 0:
            status = "empty"
        elif total_available == 0:
            status = "full"
        elif total_available <= total_slots * 0.25:
            status = "almost_full"
        else:
            status = "available"

        data[str(date)] = {
            "status": status,
            "available": total_available,   # future slots
            "total": total_slots           # full capacity
            # "available": total_available
        }

    return Response(data)




# @api_view(['GET'])
# def monthly_summary(request, doctor_id):
#     month_str = request.GET.get("month")
    
#     if not month_str:
#         return Response({"error": "Month parameter required"}, status=400)

#     year, month = map(int, month_str.split("-"))
#     total_days = monthrange(year, month)[1]
#     data = {}

#     for day in range(1, total_days + 1):
#         date = datetime(year, month, day).date()

#         # Check for leave
#         if DoctorLeave.objects.filter(doctor_id=doctor_id, date=date).exists():
#             data[str(date)] = {"status": "leave", "available": 0}
#             continue

#         day_name = date.strftime("%A")
#         availabilities = DoctorAvailability.objects.filter(
#             doctor_id=doctor_id,
#             day=day_name
#         )

#         if not availabilities.exists():
#             data[str(date)] = {"status": "empty", "available": 0}
#             continue

#         total_available = 0
#         total_slots = 0
#         doctor=DoctorProfile.objects.get(id=doctor_id)

#         appointments = Appointment.objects.filter(
#             doctor_id=doctor_id,
#             date=date,
#             status='BOOKED'
#         ).values('time_slot')

#         booked_map = {}
#         for appt in appointments:
#             t = appt['time_slot']
#             booked_map[t] = booked_map.get(t, 0) + 1

#         for a in availabilities:
#             start = datetime.combine(date, a.start_time)
#             end = datetime.combine(date, a.end_time)
#             max_patients = getattr(a, "max_patients", 1)
#             now = datetime.now()


#             while start < end:
#                 if date == now.date() and start <= now:
#                     start += timedelta(minutes=a.slot_duration)
#                     continue


#                 slot_time = start.time()

#                 booked = booked_map.get(slot_time, 0)

#                 available = max_patients - booked

#                 total_slots += max_patients
#                 total_available += max(available, 0)

#                 start += timedelta(minutes=a.slot_duration)
#         print(date, "TOTAL:", total_slots, "AVAILABLE:", total_available)
#         # Calculate status
#         if total_slots == 0:
#             status = "empty"
#         elif total_available == 0:
#             status = "full"
#         elif total_available <= total_slots * 0.25:
#             status = "almost_full"
#         else:
#             status = "available"

#         data[str(date)] = {
#             "status": status,
#             "available": total_available
#         }

#     return Response(data)



# @api_view(['GET'])
# def monthly_summary(request, doctor_id):
#     month = request.GET.get("month")  # format: 2026-04

#     if not month:
#         return Response({"error": "Month required"}, status=400)

#     year, month = map(int, month.split("-"))

#     from calendar import monthrange
#     total_days = monthrange(year, month)[1]

#     data = {}

#     for day in range(1, total_days + 1):
#         date = datetime(year, month, day).date()

#         # 🚫 Leave
#         if DoctorLeave.objects.filter(doctor_id=doctor_id, date=date).exists():
#             data[str(date)] = {"status": "leave", "available": 0}
#             continue

#         day_name = date.strftime("%A")

#         availabilities = DoctorAvailability.objects.filter(
#             doctor_id=doctor_id,
#             day=day_name
#         )

#         total_slots = 0

#         for a in availabilities:
#             start = datetime.combine(date, a.start_time)
#             end = datetime.combine(date, a.end_time)

#             while start < end:
#                 total_slots += getattr(a, "max_patients", 1)
#                 start += timedelta(minutes=a.slot_duration)

#         data[str(date)] = {
#             "status": "available" if total_slots > 0 else "empty",
#             "available": total_slots
#         }

#     return Response(data)



