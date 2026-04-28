from queue_management.models import Queue
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import now
from appointments.views import get_slots_logic


@api_view(['GET'])
def view_queue(request, doctor_id):
    today = now().date()
    queue = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status__in=['ARRIVED','IN_CONSULTATION'],
       appointment__date=today,
    ).order_by('-is_emergency', 'token_number')

    

    data = [
        {
            "id": q.id, 
            "token": q.token_number,
            "date": str(q.appointment.date), 
            "time":str(q.appointment.time_slot),
            "patient": q.appointment.patient.name or (
                str(q.appointment.patient) if q.appointment.patient else "Guest"
            ),
            "is_serving": q.is_serving,
            "is_emergency": q.is_emergency,
            "appointment_id": q.appointment.id
        }
        for q in queue
    ]

    

    return Response(data)




# @api_view(['POST'])
# def next_patient(request, doctor_id):

#     # remove current serving
#     Queue.objects.filter(
#         appointment__doctor_id=doctor_id,
#         is_serving=True
#     ).update(is_serving=False)

#     # get next patient
#     next_q = Queue.objects.filter(
#         appointment__doctor_id=doctor_id,
#         appointment__status='BOOKED'
#     ).order_by('-is_emergency', 'token_number').first()

#     if not next_q:
#         return Response({"message": "No patients in queue"})

#     next_q.is_serving = True
#     next_q.save()

#     # 🔥 GET FULL UPDATED QUEUE
#     queue = Queue.objects.filter(
#         appointment__doctor_id=doctor_id,
#         appointment__status='BOOKED'
#     ).order_by('-is_emergency', 'token_number')

#     data = [
#         {
#             "id": q.id,
#             "token": q.token_number,
#             "patient": q.appointment.patient_name or (
#                 str(q.appointment.patient) if q.appointment.patient else "Guest"
#             ),
#             "is_serving": q.is_serving,
#             "is_emergency": q.is_emergency,
#             "appointment_id": q.appointment.id
#         }
#         for q in queue
#     ]

#     # 🔥 SEND FULL QUEUE
#     channel_layer = get_channel_layer()

#     async_to_sync(channel_layer.group_send)(
#         f'queue_{doctor_id}',
#         {
#             "type": "send_queue_update",
#             "data": data
#         }
#     )

#     return Response({
#         "message": "Now serving",
#         "token": next_q.token_number
#     })



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def next_patient(request, doctor_id):

    if request.user.role != "DOCTOR":
        return Response({"error": "Only doctor allowed"}, status=403)

    today = now().date()

    # 🔥 REMOVE CURRENT SERVING
    current = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        is_serving=True,
        appointment__date=today
    ).first()

    if current:
        current.is_serving = False
        # current.appointment.status = "COMPLETED"
        # current.appointment.save()
        current.save()

    # 🔥 GET NEXT PATIENT
    next_q = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status__in=['ARRIVED', 'IN_CONSULTATION'],
        appointment__date=today,
        is_serving=False
    ).order_by('-is_emergency', 'token_number').first()

    if not next_q:
        return Response({"message": "No patients in queue"})

    next_q.is_serving = True
    next_q.appointment.status = "IN_CONSULTATION"
    next_q.appointment.save()
    next_q.save()

    # 🔥 SEND UPDATED QUEUE
    queue = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status__in=['ARRIVED','IN_CONSULTATION'],
        appointment__date=today
    ).order_by('-is_emergency', 'token_number')

    data = [
        {
            "id": q.id,
            "token": q.token_number,
            "patient": q.appointment.patient.name,  # ✅ FIXED
            "is_serving": q.is_serving,
            "is_emergency": q.is_emergency,
            "appointment_id": q.appointment.id
        }
        for q in queue
    ]

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f'queue_{doctor_id}',
        {
            "type": "send_queue_update",
            "data": data
        }
    )

    # 🔥 SLOT UPDATE (ADD THIS)
    slots = get_slots_logic(next_q.appointment.doctor, today)

    async_to_sync(channel_layer.group_send)(
        f"slots_{doctor_id}",
        {
            "type": "send_slots_update",
            "data": slots
        }
    )

    return Response({
        "message": "Now serving",
        "token": next_q.token_number
    })



@api_view(['POST'])
def mark_emergency(request, pk):
    try:
        queue = Queue.objects.get(id=pk)

        print(queue,'q---------')
    except Queue.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    queue.is_emergency = True
    queue.save()

    doctor_id = queue.appointment.doctor.id

    # 🔥 REORDER QUEUE (IMPORTANT)
    queues = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status__in=['ARRIVED','IN_CONSULTATION']
    ).order_by('-is_emergency', 'token_number')

    # 🔥 FORMAT DATA
    data = [
        {
            "id": q.id,
            "token": q.token_number,
            "patient": q.appointment.patient.name if q.appointment.patient else "Guest",
            "is_serving": q.is_serving,
            "is_emergency": q.is_emergency,
            "appointment_id": q.appointment.id
        }
        for q in queues
    ]


    # 🔥 SEND WEBSOCKET UPDATE
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f'queue_{doctor_id}',
        {
            "type": "send_queue_update",
            "data": data
        }
    )


    return Response({"message": "Marked emergency"})



