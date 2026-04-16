from rest_framework.decorators import api_view
from rest_framework.response import Response
from .serializers import RegisterSerializer


@api_view(['POST'])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "user Created Successfully"})
    
    return Response(serializer.errors)