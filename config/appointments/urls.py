from django.urls import path
from .views import *


urlpatterns = [
    path('doctors/',create_doctor_profile),
    path('doctors/create-user/',create_doctor_user),
    path('appointments/book/', book_appointment),
    path('appointments/', list_appointments),
    path('appointments/cancel/<int:pk>/', cancel_appointment),
    path('availability/', create_availability),

    
]

