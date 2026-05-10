import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Appointment
from django.utils import timezone


class SlotConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.doctor_id = self.scope['url_route']['kwargs']['doctor_id']
        self.group_name = f"slots_{self.doctor_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def send_slots_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))



# =========================================
# DASHBOARD WEBSOCKET
# =========================================

class DashboardConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        print("Dashboard websocket connected")

        self.group_name = "dashboard"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        await self.send_dashboard_stats()


    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )


    async def dashboard_update(self, event):

        await self.send_dashboard_stats()


    async def send_dashboard_stats(self):

        today = timezone.now().date()

        booked = await sync_to_async(
            lambda: Appointment.objects.filter(
                status="BOOKED",
                date=today
            ).count()
        )()

        arrived = await sync_to_async(
            lambda: Appointment.objects.filter(
                status="ARRIVED",
                date=today
            ).count()
        )()

        completed = await sync_to_async(
            lambda: Appointment.objects.filter(
                status="COMPLETED",
                date=today
            ).count()
        )()

        await self.send(
            text_data=json.dumps({
                "booked": booked,
                "arrived": arrived,
                "completed": completed,
            })
        )




class AppointmentConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        user = self.scope["user"]

        if user.is_anonymous:
            await self.close()
            return

        self.group_name = f"appointments_{user.id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()


    async def disconnect(self, close_code):

        # ✅ VERY IMPORTANT
        group_name = getattr(self, "group_name", None)

        if group_name:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )


    async def appointment_update(self, event):

        await self.send(
            text_data=json.dumps(event["data"])
        )








