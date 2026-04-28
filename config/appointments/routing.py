from django.urls import re_path
from .consumers import SlotConsumer

websocket_urlpatterns = [
    re_path(r'ws/slots/(?P<doctor_id>\d+)/$', SlotConsumer.as_asgi()),
]