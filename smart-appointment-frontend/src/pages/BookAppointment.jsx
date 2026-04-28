import { useState, useEffect } from "react";
import { useNavigate,useLocation } from "react-router-dom";
import API from "../api/api";
import { getDoctors } from "../services/doctor";
import { bookAppointments } from "../services/appointment";
import { getAppointments } from "../services/appointment";
import toast from "react-hot-toast";
import DoctorQueue from "./DoctorQueue";


function BookAppointment() {
  const navigate = useNavigate();
  const { state } = useLocation();

  console.log(state,'state---------');
  
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isGuest = !role;
  const isAdmin = role === "ADMIN";
  const isPatient = role === "PATIENT";






  console.log(token,'token---');
  

  const [doctors, setDoctors] = useState([]);

  console.log(doctors,'doctors');
  
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
          (a) =>
            a.status === "BOOKED" &&
          a.date === form.date &&
          a.time_slot === form.time_slot
        )

        // const active = apptRes.data.find(
        //   (a) => a.status === "BOOKED"
        // );

        if (sameTime) {
          alert("You already have another appointment at this time");
          
          return;
        }

        // ❌ Same doctor same day
        const sameDoctor = appointments.find(
          (a) =>
            a.status === "BOOKED" &&
            a.date === form.date &&
            a.doctor === form.doctor
        );

        if (sameDoctor) {
          alert("You already booked this doctor today");
          return;
        }


        // ❌ Max 3 per day
        const count = appointments.filter(
          (a) =>
            a.status === "BOOKED" &&
            a.date === form.date
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
      toast.success(`Booked! Token: ${res.data.token_number}`)
      // alert(`✅ Booked! Token: ${res.data.token_number}`);

    


      if (isGuest) {
        localStorage.setItem("guest_token", res.data.token_number);
        localStorage.setItem("guest_doctor", form.doctor);
      }

      localStorage.removeItem("selected_doctor");
      
      // ✅ RESET FORM FOR ADMIN
      if (isAdmin) {
        setForm({
          doctor: form.doctor,   // keep doctor
          date: form.date,       // keep date
          time_slot: "",
          patient_name: "",
          patient_phone: "",
          patient_email: "",
          age:"",
          gender:""
        });
      } else {
        navigate("/queue");
      }
      
    } catch (err) {
      console.error(err.response?.data);

      alert(
        err.response?.data?.error ||
        "Booking failed ❌"
      );
    }
  };
  



  const handleChange = (e) => {
    const {name,value} = e.target;

    console.log(name,value,'name,value');
    
    setForm({
      ...form,
      [name]:value
    })
  }

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



  return (
    <div className="flex gap-6 p-6">

      <div className={isAdmin ? "w-1/2" :  "w-full max-w-md mx-auto"}>

        <h1 className="text-2xl font-bold mb-2 text-center">
          Book Appointment
        </h1>

        {isAdmin && (
          <p className="text-sm text-gray-500 text-center mb-4">
            Booking for patient (Admin mode)
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 👥 Guest Fields */}
          {(isGuest || isAdmin) && (
            <>
              <input
                type="text"
                name="patient_name"
                value={form.patient_name}
                placeholder="Patient Name"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />

              <input
                type="text"
                name="patient_phone"
                value={form.patient_phone}
                placeholder="Phone Number"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />

              <input
                type="email"
                name="patient_email"
                value={form.patient_email}
                placeholder="Email (optional)"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />

              <input
                type="number"
                name="age"
                value={form.age}
                placeholder="Age"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />

              <select
                name="gender"
                value={form.gender}
                className="border p-2 w-full rounded"
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
            className="border p-2 w-full rounded"
            onChange={handleChange}
          >
            <option value="">Select Doctor</option>
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
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />

          <input
            type="time"
            name="time_slot" 
            value={form.time_slot}
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />

          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full">
            Book Appointment
          </button>
        </form>
      </div>

      {isAdmin && (
        <div className="w-1/2 border-l pl-4">
          <DoctorQueue />
        </div>
      )}

      



    </div>
  );
}

export default BookAppointment;