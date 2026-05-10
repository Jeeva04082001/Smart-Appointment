import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api/api";
import { getDoctors } from "../services/doctor";
import {
  bookAppointments,
  getAppointments,
  searchPatients,
} from "../services/appointment";
import toast from "react-hot-toast";
import DoctorQueue from "./DoctorQueue";
import { getSlots } from "../services/slotService";
import { Search, X, Check, AlertCircle } from "lucide-react";

function BookAppointment() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isGuest = !role;
  const isAdmin = role === "ADMIN";
  const isPatient = role === "PATIENT";

  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctor: "",
    date: "",
    time_slot: "",
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    age: "",
    gender: "",
  });

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 🎯 IMPROVED SEARCH STATE
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);

  // 🔥 Fetch doctors
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await getDoctors();
      setDoctors(res.data.doctors);
    } catch (err) {
      console.error(err);
    }
  };

  // 🎯 IMPROVED SEARCH WITH DEBOUNCE & ERROR HANDLING
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (search.trim()) {
        await patientSearch(search);
      } else {
        setResults([]);
        setSearchError("");
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const patientSearch = async (value) => {
    setIsSearching(true);
    setSearchError("");
    setHighlightedIndex(-1);

    try {
      const res = await searchPatients(value);
      
      if (res.data && res.data.length > 0) {
        setResults(res.data);
        setShowResults(true);
      } else {
        setResults([]);
        setSearchError("No patients found");
      }
    } catch (err) {
      setResults([]);
      setSearchError("Search failed. Try again.");
      console.log(err);
    } finally {
      setIsSearching(false);
    }
  };

  // 🎯 KEYBOARD NAVIGATION FOR SEARCH RESULTS
  const handleSearchKeyDown = (e) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          selectPatient(results[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowResults(false);
        setSearch("");
        break;
      default:
        break;
    }
  };

  // 🎯 IMPROVED SELECT PATIENT
  const selectPatient = (patient) => {
    setForm({
      ...form,
      patient_name: patient.name,
      patient_phone: patient.phone,
      patient_email: patient.email || "",
      age: patient.age || "",
      gender: patient.gender || "",
    });
    setResults([]);
    setShowResults(false);
    setSearch(patient.name);
    setHighlightedIndex(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validation
    if (!form.doctor || !form.date || !form.time_slot) {
      alert("Please select doctor, date and time");
      return;
    }

    if ((isGuest || isAdmin) && (!form.patient_name || !form.patient_phone)) {
      alert("Name and phone required for guest");
      return;
    }

    try {
      // 🔥 CHECK ACTIVE BEFORE BOOKING
      if (!isGuest) {
        const apptRes = await getAppointments();
        const appointments = apptRes.data;

        // ❌ Same time (any doctor)
        const sameTime = appointments.find(
          (a) => a.status === "BOOKED" && a.date === form.date && a.time_slot === form.time_slot
        );

        if (sameTime) {
          alert("You already have another appointment at this time");
          return;
        }

        // ❌ Same doctor same day
        const sameDoctor = appointments.find(
          (a) => a.status === "BOOKED" && a.date === form.date && a.doctor === form.doctor
        );

        if (sameDoctor) {
          alert("You already booked this doctor today");
          return;
        }

        // ❌ Max 3 per day
        const count = appointments.filter(
          (a) => a.status === "BOOKED" && a.date === form.date
        ).length;

        if (count >= 3) {
          alert("Maximum 3 appointments allowed per day");
          return;
        }
      }

      const payload = {
        doctor: form.doctor,
        date: form.date,
        time_slot: form.time_slot,
      };

      // 👥 Guest data
      if (isGuest || isAdmin) {
        payload.patient_name = form.patient_name;
        payload.patient_phone = form.patient_phone;
        payload.patient_email = form.patient_email;
        payload.age = form.age;
        payload.gender = form.gender;
      }

      const res = await bookAppointments(payload);
      toast.success(`Booked! Token: ${res.data.token_number}`);

      if (isGuest) {
        localStorage.setItem("guest_token", res.data.token_number);
        localStorage.setItem("guest_doctor", form.doctor);
      }

      localStorage.removeItem("selected_doctor");

      // ✅ RESET FORM FOR ADMIN
      if (isAdmin) {
        setForm({
          doctor: form.doctor,
          date: form.date,
          time_slot: "",
          patient_name: "",
          patient_phone: "",
          patient_email: "",
          age: "",
          gender: "",
        });
      } 
      // else {
      //   navigate("/queue");
      // }

      // ✅ GUEST
      else if (isGuest) {

        navigate("/queue");

      }

      // ✅ LOGGED-IN PATIENT
      else if (isPatient) {

        navigate("/appointments");

      }



    } catch (err) {
      console.error(err.response?.data);
      alert(err.response?.data?.error || "Booking failed ❌");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  useEffect(() => {
    fetchDoctors();

    // 🔥 PREFILL DOCTOR
    const selectedDoctor = localStorage.getItem("selected_doctor");

    if (selectedDoctor) {
      setForm((prev) => ({
        ...prev,
        doctor: selectedDoctor,
      }));
    }
  }, []);

  useEffect(() => {
    if (state) {
      setForm((prev) => ({
        ...prev,
        doctor: state.doctor || "",
        date: state.date || "",
        time_slot: state.time_slot || "",
      }));
    }
  }, [state]);

  useEffect(() => {
    if (form.doctor && form.date) {
      fetchSlots();
    }
  }, [form.doctor, form.date]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await getSlots(form.doctor, form.date);
      setSlots(res.data.slots);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const groupSlots = () => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    slots.forEach((slot) => {
      const hour = new Date(`1970-01-01 ${slot.time}`).getHours();
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  };

  const { morning, afternoon, evening } = groupSlots();

  useEffect(() => {
    if (!form.doctor) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/slots/${form.doctor}/`);

    socket.onmessage = (event) => {

      const data = JSON.parse(event.data);

      const now = new Date();

      setSlots(data.slots || data);

    };

    return () => socket.close();
  }, [form.doctor]);

  const SlotButton = ({ slot }) => {
    const isFull = slot.available === 0;

    const now = new Date();

    const slotDateTime = new Date(
      `${form.date}T${slot.time}`
    );

    const isExpired = slotDateTime < now;

    // if (slot.available === 0) return null;


    return (
      <button
        type="button"
        disabled={isFull || isExpired}
        onClick={() => {
          setSelectedSlot(slot.time);
          setForm((prev) => ({ ...prev, time_slot: slot.time }));
        }}
        className={`
          px-3 py-2 border rounded text-sm transition-all
          ${
            isExpired
              ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
              : isFull
              ? "bg-red-100 text-red-500 border-red-300 cursor-not-allowed"
              : selectedSlot === slot.time
              ? "bg-green-500 text-white border-green-600"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300"
          }
        `}
      >
        <div className="flex flex-col items-center">
          <span>{slot.time}</span>

          {isExpired && (
            <span className="text-xs">
              Expired
            </span>
          )}

          {isFull && !isExpired && (
            <span className="text-xs">
              Booked
            </span>
          )}
        </div>

      </button>
    );
  };

  return (
    /* ✅ KEY FIX: min-h-screen keeps bg full, but card is inline-block/fit-content — no fixed height */
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 h-fit">

        <h1 className="text-3xl font-bold mb-1 text-gray-800">
          Book Appointment
        </h1>

        {isAdmin && (
          <p className="text-sm text-blue-600 mb-6 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
            Booking for patient (Admin mode)
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* 🎯 IMPROVED SEARCH BOX */}
          {isAdmin && (

            <div className="relative">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => search.trim() && results.length > 0 && setShowResults(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search patient by name or phone..."
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-sm"
                />

                {/* Clear Button */}
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setResults([]);
                      setShowResults(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}

                {/* Loading Spinner */}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* 🎯 IMPROVED DROPDOWN RESULTS */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 border-2 border-gray-200 rounded-lg bg-white shadow-xl z-50 overflow-hidden">
                  {results.length > 0 ? (
                    <>
                      <div className="max-h-60 overflow-y-auto">
                        {results.map((patient, idx) => (
                          <div
                            key={patient.id}
                            onClick={() => selectPatient(patient)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-all ${
                              highlightedIndex === idx
                                ? "bg-blue-50 border-l-4 border-l-blue-500"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800 text-sm">
                                  {patient.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  📱 {patient.phone}
                                </p>
                              </div>
                              {patient.age && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {patient.age} yrs
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t text-center">
                        {results.length} patient{results.length !== 1 ? "s" : ""} found
                      </div>
                    </>
                  ) : null}

                  {/* Error State */}
                  {searchError && (
                    <div className="px-4 py-3 text-sm text-amber-700 bg-amber-50 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {searchError}
                    </div>
                  )}
                </div>
              )}
            </div>

          )}

          {/* Auto-fill Status */}
          {form.patient_name && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Check size={16} className="text-green-600" />
              <span className="text-sm text-green-700">
                Patient info loaded: <strong>{form.patient_name}</strong>
              </span>
            </div>
          )}

          {/* 👥 Guest Fields */}
          {(isGuest || isAdmin) && (
            <>
              <input
                type="text"
                name="patient_name"
                value={form.patient_name}
                placeholder="Patient Name *"
                className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                onChange={handleChange}
              />

              <input
                type="text"
                name="patient_phone"
                value={form.patient_phone}
                placeholder="Phone Number *"
                className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                onChange={handleChange}
              />

              <input
                type="email"
                name="patient_email"
                value={form.patient_email}
                placeholder="Email (optional)"
                className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                onChange={handleChange}
              />

              <input
                type="number"
                name="age"
                value={form.age}
                placeholder="Age"
                className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                onChange={handleChange}
              />

              <select
                name="gender"
                value={form.gender}
                className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </>
          )}

          {/* 👨‍⚕️ Doctor Selection */}
          <select
            name="doctor"
            value={form.doctor}
            className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-medium"
            onChange={handleChange}
          >
            <option value="">Select Doctor *</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.doctor_name} - {doc.specialization}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="date"
            value={form.date}
            className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            onChange={handleChange}
          />

          {/* Loading */}
          {!isAdmin && loadingSlots && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              Loading available slots...
            </div>
          )}

          {/* No slots */}
          {!isAdmin && !loadingSlots && form.date && slots.length === 0 && (
            <p className="text-amber-700 bg-amber-50 p-3 rounded-lg text-sm">
              No slots available for this date
            </p>
          )}

          {!isAdmin && slots.length > 0 && (
            <div className="mt-4 space-y-4">
              {morning.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                      <span>🌅</span> Morning
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {morning.map((s, i) => (
                        <SlotButton key={i} slot={s} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {afternoon.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                      <span>☀️</span> Afternoon
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {afternoon.map((s, i) => (
                        <SlotButton key={i} slot={s} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {evening.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                      <span>🌙</span> Evening
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {evening.map((s, i) => (
                        <SlotButton key={i} slot={s} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <input
            type="time"
            name="time_slot"
            value={form.time_slot}
            className="border-2 border-gray-200 p-3 w-full rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            onChange={handleChange}
          />

          <button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            ✓ Book Appointment
          </button>
        </form>
      </div>
    </div>
  );
}

export default BookAppointment;