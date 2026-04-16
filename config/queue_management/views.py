from queue_management.models import Queue
from rest_framework.decorators import api_view
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync




@api_view(['GET'])
def view_queue(request, doctor_id):
    queue = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status='BOOKED'
    ).order_by('-is_emergency', 'token_number')

    data = [
        {
            "token": q.token_number,
            "patient": q.appointment.patient_name or str(q.appointment.patient),
            "status": q.is_serving
        }
        for q in queue
    ]

    return Response(data)



@api_view(['POST'])
def next_patient(request, doctor_id):

    # remove current serving
    Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        is_serving=True
    ).update(is_serving=False)

    # get next patient
    next_q = Queue.objects.filter(
        appointment__doctor_id=doctor_id,
        appointment__status='BOOKED'
    ).order_by('-is_emergency','token_number').first()

    if not next_q:
        return Response({"message": "No patients in queue"})

    next_q.is_serving = True
    next_q.save()

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f'queue_{doctor_id}',
        {
            "type": "send_queue_update",
            "data": {
                "message": "Now serving",
                "token": next_q.token_number
            }
        }
    )


    return Response({
        "message": "Now serving",
        "token": next_q.token_number
    })




