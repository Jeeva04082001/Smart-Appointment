# ✅ CORRECTED urls.py with PROPER ORDER
# The key: Specific paths MUST come BEFORE generic patterns

from django.urls import path
from .views import *

urlpatterns = [
    # 🔥 ============================================
    # 🔥 SPECIFIC PATHS FIRST (must be before 'doctors/')
    # 🔥 ============================================
    path('doctors/save/', save_doctor),              # ✅ SPECIFIC
    path('doctors/create-user/', create_doctor_user),  # ✅ SPECIFIC
    
    # 🔥 ============================================
    # 🔥 PARAMETERIZED PATHS (with ID)
    # 🔥 ============================================
    path('doctors/<int:pk>/', doctor_detail),       # GET single doctor
    path('doctors/<int:pk>/delete/', delete_doctor),  # DELETE doctor
    
    # 🔥 ============================================
    # 🔥 GENERIC LIST PATH (MUST be LAST for this prefix)
    # 🔥 ============================================
    path('doctors/', doctors),                      # GET all doctors - MUST be LAST!
    
    # ============================================
    # Other endpoints
    # ============================================
    path('appointments/book/', book_appointment),
    path('appointments/cancel/<int:pk>/', cancel_appointment),
    path('appointments/complete/<int:pk>/', complete_appointment),
    # path('appointments/<int:id>/arrive/', mark_arrived),
    path('appointment/arrived/<int:id>/', mark_arrived),
    path('appointment/mark-no-show/<int:appointment_id>/', mark_no_show),
    path('appointments/', list_appointments),
    path('availability/create/', create_availability),
    path('slots/<int:doctor_id>/', get_slots),
    path('leave/create/', create_leave),
    path('leaves/<int:doctor_id>/', get_leaves),
    path('monthly-summary/<int:doctor_id>/', monthly_summary),
    
    # ============================================
    # Specializations - same pattern (specific first)
    # ============================================
    path('specializations/create/', create_specialization),  # ✅ SPECIFIC
    path('specializations/<int:pk>/', update_specialization),  # ✅ PARAMETERIZED
    path('specializations/<int:pk>/delete/', delete_specialization),  # ✅ PARAMETERIZED
    path('specializations/', get_specializations),  # ✅ GENERIC (LAST!)
]




# from django.urls import path
# from .views import *


# urlpatterns = [
#     # path('doctors/',create_doctor_profile),
#     # path('doctor-list/', get_doctors),
#     # path('doctors/', doctors), 
#     path('doctors/', doctors),          # GET (public)
#     path('doctors/save/', save_doctor),
#     # path('doctors/create/', create_doctor),  # POST (admin)
#     path('doctors/<int:pk>/', doctor_detail),
#     # path('doctors/<int:pk>/update/', update_doctor),
#     path('doctors/<int:pk>/delete/', delete_doctor),
#     path('doctors/create-user/',create_doctor_user),

#     path('appointments/book/', book_appointment),
#     path('appointments/cancel/<int:pk>/', cancel_appointment),
#     path('appointments/', list_appointments),
#     path('availability/', create_availability),
#     path('appointments/complete/<int:pk>/', complete_appointment),
#     path("appointments/<int:id>/arrive/", mark_arrived),
#     path('slots/<int:doctor_id>/', get_slots),
#     path('specializations/', get_specializations),              # GET
#     path('specializations/create/', create_specialization),     # POST
#     path('specializations/<int:pk>/', update_specialization),   # PUT
#     path('specializations/<int:pk>/delete/', delete_specialization),  # DELETE


# ]

