from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from .serializers import RegisterSerializer,CustomTokenSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny]) 
def register_user(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "user Created Successfully"})
    
    return Response(serializer.errors)



class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer
    permission_classes = [AllowAny] 



    