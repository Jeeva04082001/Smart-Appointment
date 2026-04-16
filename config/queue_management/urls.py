from django.urls import path
from .views import view_queue, next_patient

urlpatterns = [
    path('queue/<int:doctor_id>/', view_queue),
    path('queue/next/<int:doctor_id>/', next_patient),
]







