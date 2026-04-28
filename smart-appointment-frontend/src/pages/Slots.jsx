import React, { useEffect, useState, useCallback } from "react";
import { getDoctors } from "../services/doctorService";
import { createAvailability, getSlots, createLeave ,getMonthlySummary} from "../services/slotService";
import API from "../api/api";
import toast from "react-hot-toast";
import { Clock, Calendar, Users, AlertCircle, CheckCircle, XCircle, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import { bookAppointments } from "../services/appointment";

import { useNavigate } from "react-router-dom";

const Slots = () => {
  // Original state
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const isLeave = leaves.some((l) => l.slice(0, 10) === date);
  console.log("Selected Date:", date);

  const [form, setForm] = useState({
    doctor: "",
    day: "",
    start_time: "",
    end_time: "",
    slot_duration: 15,
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "form"
  const [dayDetails, setDayDetails] = useState(null);

  useEffect(() => {
    if (!selectedDoctor) return;

    const socket = new WebSocket(
      `ws://localhost:8000/ws/slots/${selectedDoctor}/`
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("LIVE SLOT UPDATE:", data);
      setSlots(data);
    };

    socket.onclose = () => {
      console.log("Socket closed");
    };

    return () => socket.close();
  }, [selectedDoctor]);



  // 🔥 FETCH DOCTORS
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const res = await getDoctors();
    setDoctors(res.data.doctors || []);
  };

  // 🔥 BUILD CALENDAR DATA (monthly heatmap)
  // const buildCalendarData = useCallback(async () => {
  //   if (!selectedDoctor) return;

  //   const year = currentMonth.getFullYear();
  //   const month = currentMonth.getMonth();
  //   const firstDay = new Date(year, month, 1);
  //   const lastDay = new Date(year, month + 1, 0);

  //   const data = {};

  //   for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
  //     const dateStr = d.toLocaleDateString("en-CA");
      
  //     // Check if it's a leave date
  //     const isLeaveDay = leaves.some((l) => l.slice(0, 10) === dateStr);
      
  //     if (isLeaveDay) {
  //       data[dateStr] = { status: "leave", slots: [], available: 0 };
  //     } else {
  //       data[dateStr] = { status: "unknown", slots: [], available: 0 };
  //     }


  //     // if (isLeaveDay) {
  //     //   data[dateStr] = { status: "leave", slots: [], available: 0 };
  //     // } else {
  //     //   try {
  //     //     const res = await getSlots(selectedDoctor, dateStr);
  //     //     const slots = res.data.slots || [];
  //     //     const totalAvailable = slots.reduce((sum, s) => sum + s.available, 0);
  //     //     data[dateStr] = {
  //     //       // status: slots.length > 0 ? (totalAvailable > 0 ? "available" : "full") : "empty",
  //     //       status: "unknown",
  //     //       slots,
  //     //       available: totalAvailable,
  //     //     };
  //     //   } catch {
  //     //     data[dateStr] = { status: "empty", slots: [], available: 0 };
  //     //   }
  //     // }


  //   }

  //   setCalendarData(data);
  // }, [selectedDoctor, currentMonth, leaves]);

  const buildCalendarData = useCallback(async () => {
    if (!selectedDoctor) return;

    try {
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, "0");

      const res = await getMonthlySummary(selectedDoctor, `${year}-${month}`);

      // Transform flat data structure into expected format
      const transformedData = {};
      Object.entries(res.data).forEach(([dateStr, value]) => {
        transformedData[dateStr] = {
          status: value.status,
          available: value.available,
          total: value.total,
          slots: [],
        };
      });

      setCalendarData(transformedData);
    } catch (err) {
      console.error("Error fetching monthly summary:", err);
      toast.error("Failed to load calendar data");
    }
  }, [selectedDoctor, currentMonth]);

  useEffect(() => {
    buildCalendarData();
  }, [buildCalendarData]);

  // 🔥 CREATE AVAILABILITY
  const handleCreateAvailability = async () => {
    if (!form.doctor || !form.day || !form.start_time || !form.end_time) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      await createAvailability(form);
      setForm({
        doctor: "",
        day: "",
        start_time: "",
        end_time: "",
        slot_duration: 15,
      });
      toast.success("Availability created successfully");
      buildCalendarData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create availability");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 GET SLOTS
  const handleGetSlots = async () => {

    if (!selectedDoctor || !date) return;

    if (!selectedDoctor || !date) {
      toast.error("Please select doctor and date");
      return;
    }

    try {
      setLoading(true);
      const res = await getSlots(selectedDoctor, date);
      setSlots(res.data.slots || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "No slots available");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 CREATE LEAVE
  const handleLeave = async () => {
    if (!selectedDoctor || !date) {
      toast.error("Please select doctor and date");
      return;
    }

    try {
      setLoading(true);
      await createLeave({
        doctor: selectedDoctor,
        date,
      });
      await fetchLeaves(selectedDoctor);
      toast.success("Doctor leave marked successfully");
      setSlots([]);
      buildCalendarData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark leave");
    } finally {
      setLoading(false);
    }
  };

  const getDoctorName = (id) => {
    return doctors.find((d) => d.id === parseInt(id))?.doctor_name || "Unknown";
  };

  const getSlotStatus = (slot) => {
    if (slot.is_full) {
      return { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Fully Booked", icon: "🔴" };
    } else if (slot.is_almost_full) {
      return { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Almost Full", icon: "🟡" };
    } else if (slot.is_next) {
      return { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Next Slot", icon: "🔵" };
    } else {
      return { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Available", icon: "🟢" };
    }
  };

  const fetchLeaves = async (doctorId) => {
    const res = await API.get(`/leaves/${doctorId}/`);
    setLeaves(res.data.leaves);
  };

  useEffect(() => {
    if (isLeave) {
      setSlots([]);
    }
  }, [isLeave]);

  const getDayFromDate = (dateStr) => {
    // Parse the date string (YYYY-MM-DD) and get the day of week
    const date = new Date(dateStr + "T00:00:00"); // Add time to avoid timezone issues
    return date.toLocaleDateString("en-US", {
      weekday: "long",
    });
  };

  // Calendar navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentMonth);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentMonth(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentMonth);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentMonth(newDate);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Handle calendar date click
  const handleDateClick = async (dateStr, dayData) => {
    setDate(dateStr);
    setDayDetails(dayData);
    setForm((prev) => ({
      ...prev,
      day: getDayFromDate(dateStr),
    }));

    // 🔥 CALL API ONLY HERE
    if (selectedDoctor && dateStr) {
      try {
        setLoading(true);
        const res = await getSlots(selectedDoctor, dateStr);
        setSlots(res.data.slots || []);
      } catch (err) {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    }
    
    // // Auto-load slots for clicked date
    // if (dayData.slots && dayData.slots.length > 0) {
    //   setSlots(dayData.slots);
    // }
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // const today = new Date().toISOString().split("T")[0];

    const formatDate = (date) => {
    return date.toLocaleDateString("en-CA");
    };

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const today = formatDate(todayDate);
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square bg-gray-50 rounded-lg" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
    //   const dateStr = d.toISOString().split("T")[0];
      const dateStr = formatDate(d);
      const checkDate = new Date(d);
      checkDate.setHours(0, 0, 0, 0);

      const isPast = checkDate < todayDate;

      const dayData = calendarData[dateStr];

      console.log(dayData,'dayData---');
      
      const isToday = dateStr === today;
    //   const isPast = d < new Date(today);

        
        

      let statusColor = "bg-gray-100 border-gray-200 text-gray-600";
      let statusLabel = "";
      let statusIcon = "○";

    

      if (dayData) {
        if (dayData.status === "leave") {
          statusColor = "bg-red-100 border-red-300 text-red-700";
          statusLabel = "Leave";
          statusIcon = "🚫";
        } else if (dayData.status === "available") {
          statusColor = "bg-green-100 border-green-300 text-green-700";
          statusLabel = `${dayData.available}/${dayData.total} slots`;
          statusIcon = "✓";
        } else if (dayData.status === "almost_full") {  // ✅ ADD THIS
          statusColor = "bg-orange-100 border-orange-300 text-orange-700";
          statusLabel = `${dayData.available} left`;
          statusIcon = "⚠️";
        } else if (dayData.status === "full") {          // ✅ ADD THIS
          statusColor = "bg-yellow-100 border-yellow-300 text-yellow-700";
          statusLabel = "Full";
          statusIcon = "🔒";
        } else {
          statusColor = "bg-gray-100 border-gray-200 text-gray-500";
          statusLabel = "No slots";
          statusIcon = "○";
        }
      }


      const isSelected = dateStr === date;

      days.push(
        <div
          key={dateStr}
          onClick={() => !isPast && selectedDoctor && handleDateClick(dateStr, dayData || { slots: [], available: 0, status: "empty" })}
          className={`aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 p-2 flex flex-col items-center justify-center text-center ${statusColor} ${
            isSelected ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg" : ""
          } ${isPast ? "opacity-40 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-1"} ${
            isToday ? "ring-2 ring-blue-400 scale-105" : ""
          }`}
        >
          <div className="text-xs font-bold">{day}</div>
          {dayData && !["empty", "unknown"].includes(dayData.status) && (
            <>
              <div className="text-lg">{statusIcon}</div>
              <div className="text-xs font-semibold mt-1">{statusLabel}</div>
            </>
          )}
        </div>
      );
    }

    return days;
  };

  const handleBooking = (time) => {
    navigate("/book", {
      state: {
        doctor: selectedDoctor,
        date: date,
        time_slot: time,
      },
    });
  };

  // const handleBooking = async (time) => {
  //   try {
  //     await bookAppointments({
  //       doctor: selectedDoctor,
  //       date: date,
  //       time_slot: time,   // 🔥 IMPORTANT (match backend key)
  //     });

  //     toast.success("Appointment booked");

  //     handleGetSlots();      // refresh slots
  //     buildCalendarData();   // refresh calendar

  //   } catch (err) {
  //     toast.error(err.response?.data?.error || "Booking failed");
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Hospital Calendar</h1>
              <p className="text-gray-600 text-sm mt-1">Advanced appointment scheduling system</p>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Doctor Selector */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  if (e.target.value) {
                    fetchLeaves(e.target.value);
                  }
                  setSlots([]);
                  setDate("");
                  setDayDetails(null);
                }}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
              >
                <option value="">Choose a doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.doctor_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Availability - Sticky Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900">Create Availability</h2>
              </div>

              <div className="space-y-4">
                {/* Doctor Select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Doctor
                  </label>
                  <select
                    value={form.doctor}
                    onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm hover:border-gray-400"
                  >
                    <option value="">Choose...</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.doctor_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Day of Week
                  </label>
                  <input
                    value={form.day}
                    readOnly
                    placeholder="Select date on calendar"
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 text-sm"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Start Time
                  </label>
                  <input
                    value={form.start_time}
                    type="time"
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm hover:border-gray-400"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    End Time
                  </label>
                  <input
                    value={form.end_time}
                    type="time"
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm hover:border-gray-400"
                  />
                </div>

                {/* Slot Duration */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Slot Duration (min)
                  </label>
                  <input
                    value={form.slot_duration}
                    type="number"
                    min="5"
                    max="120"
                    onChange={(e) => setForm({ ...form, slot_duration: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm hover:border-gray-400"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleCreateAvailability}
                  disabled={loading}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Availability
                </button>
              </div>
            </div>
          </div>

          {/* Right Section - Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDoctor ? `${getDoctorName(selectedDoctor)}'s Schedule` : "Select a doctor to view"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Week Navigation */}
                  <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1 bg-gray-50">
                    <button
                      onClick={goToPreviousWeek}
                      className="p-2 hover:bg-gray-200 rounded transition text-gray-600 hover:text-gray-900"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs text-gray-600 px-2 font-medium">Week</span>
                    <button
                      onClick={goToNextWeek}
                      className="p-2 hover:bg-gray-200 rounded transition text-gray-600 hover:text-gray-900"
                      title="Next week"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1 bg-gray-50">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-2 hover:bg-gray-200 rounded transition text-gray-600 hover:text-gray-900"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs text-gray-600 px-2 font-medium">Month</span>
                    <button
                      onClick={goToNextMonth}
                      className="p-2 hover:bg-gray-200 rounded transition text-gray-600 hover:text-gray-900"
                      title="Next month"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Today Button */}
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm"
                  >
                    Today
                  </button>
                </div>
              </div>

              {selectedDoctor ? (
                <>
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 mb-8">
                    {renderCalendarGrid()}
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Status Legend</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        <span className="text-sm text-gray-700">Available</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        <span className="text-sm text-gray-700">Full</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span className="text-sm text-gray-700">Leave</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded bg-gray-400" />
                        <span className="text-sm text-gray-700">No Schedule</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Select a doctor above to view their schedule</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Date Details & Slots */}
        {selectedDoctor && date && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {getDoctorName(selectedDoctor)} - {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h2>
                <p className="text-gray-600 text-sm mt-2">Day: {getDayFromDate(date)}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGetSlots}
                  disabled={loading || isLeave}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 shadow-sm"
                >
                  <Clock className="w-4 h-4" />
                  Load Slots
                </button>
                <button
                  onClick={handleLeave}
                  disabled={loading || isLeave}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 shadow-sm"
                >
                  <XCircle className="w-4 h-4" />
                  {isLeave ? "Already on Leave" : "Mark Leave"}
                </button>
              </div>
            </div>

            {/* Status Alert */}
            {isLeave && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 font-medium">Doctor is on leave on this date</p>
              </div>
            )}

            {/* Slots Grid */}
            {slots.length > 0 ? (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Available Time Slots</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {slots.map((slot, index) => {
                    const status = getSlotStatus(slot);
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 transition duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${status.bg}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl font-bold text-gray-900">{slot.time}</span>
                          <span className="text-2xl">{status.icon}</span>
                        </div>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${status.text}`}>
                          {status.label}
                        </p>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <Users className="w-4 h-4" />
                          {slot.available} {slot.available === 1 ? "spot" : "spots"} left
                        </div>

                        {/* Capacity Bar */}
                        <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              slot.is_full
                                ? "bg-red-500"
                                : slot.is_almost_full
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${slot.available === 0 ? 100 : Math.max(25, slot.available * 25)}%`,
                            }}
                          />
                        </div>

                        {/* Book Button */}
                        <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg transition duration-200 text-sm shadow-sm"
                         onClick={() => handleBooking(slot.time)}
                        >
                         
                          Book Now
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Slots Legend */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Slot Status Legend</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-gray-700">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-gray-700">Next Slot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-gray-700">Almost Full</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-gray-700">Fully Booked</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">
                  {isLeave ? "No slots available - doctor is on leave" : "No slots available for this date"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Slots;