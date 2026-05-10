from django.urls import re_path
# from .consumers import SlotConsumer
from .consumers import (
    SlotConsumer,
    DashboardConsumer,AppointmentConsumer
)

websocket_urlpatterns = [
    re_path(r'ws/slots/(?P<doctor_id>\d+)/$', SlotConsumer.as_asgi()),
    re_path(r'ws/dashboard/$', DashboardConsumer.as_asgi()),
    re_path(r'ws/appointments/$',AppointmentConsumer.as_asgi()
),

]








