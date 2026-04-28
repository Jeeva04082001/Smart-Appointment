import { useEffect, useState } from "react";
import API from "../api/api";
import { getAppointments,markArrived } from "../services/appointment";

function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleArrived = async (id) => {
    try {
      await markArrived(id);
      fetchAppointments(); // refresh list
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">

      <h2 className="text-xl font-bold mb-4">
        Booked Patients (Admin)
      </h2>

      <div className="space-y-3">

        {appointments
          .filter((a) => a.status === "BOOKED")
          .map((appt) => (
            <div
              key={appt.id}
              className="p-4 border rounded flex justify-between items-center"
            >
              <div>
                <p><b>{appt.patient_name}</b></p>
                <p>Token: {appt.token_number}</p>
                <p className="text-sm text-gray-500">
                  {appt.date} {appt.time_slot}
                </p>
              </div>

              <button
                onClick={() => handleArrived(appt.id)}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Mark Arrived
              </button>
            </div>
          ))}

      </div>
    </div>
  );
}

export default AdminAppointments;