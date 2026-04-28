import { useEffect, useState } from "react";
import API from "../api/api";
import toast from "react-hot-toast";

function ReceptionDashboard() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const res = await API.get("/appointments/");
    setAppointments(res.data);
  };

  const handleArrive = async (id) => {
    try {
      await API.post(`/appointments/${id}/arrive/`);
      toast.success("Patient Checked-in ✅");
      fetchAppointments();
    } catch (err) {
      toast.error("Error ❌");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reception Dashboard</h1>

      {appointments.map((appt) => (
        <div key={appt.id} className="border p-4 rounded mb-3">
          <p><b>{appt.patient_name}</b></p>
          <p>Doctor: {appt.doctor_name}</p>
          <p>Status: {appt.status}</p>

          {appt.status === "BOOKED" && (
            <button
              onClick={() => handleArrive(appt.id)}
              className="bg-green-500 text-white px-3 py-1 rounded mt-2"
            >
              Mark Arrived
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default ReceptionDashboard;