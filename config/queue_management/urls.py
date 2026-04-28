from django.urls import path
from .views import *

urlpatterns = [
    path('queue/<int:doctor_id>/', view_queue),
    path('queue/next/<int:doctor_id>/', next_patient),
    path('queue/emergency/<int:pk>/', mark_emergency),


]







