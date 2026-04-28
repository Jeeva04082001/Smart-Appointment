import { useEffect, useState } from "react";
import {
  getAppointments,
  cancelAppointment,
} from "../services/appointment";
import { useNavigate } from "react-router-dom";

function Appointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("ALL");

  // 🔥 FETCH
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

  // ❌ CANCEL
  const handleCancel = async (id) => {
    try {
      await cancelAppointment(id);
      alert("Appointment Cancelled ❌");

      const role = localStorage.getItem("role");

      if (!role) {
        localStorage.removeItem("guest_token");
        localStorage.removeItem("guest_doctor");
        navigate("/book");
      } else {
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
      alert("Cancel failed ❌");
    }
  };

  // 🔥 AUTO SCROLL ACTIVE
  useEffect(() => {
    const active = document.getElementById("active-appt");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [appointments]);

  // 🔥 FILTER
  const filteredAppointments =
    filter === "ALL"
      ? appointments
      : appointments.filter((a) => a.status === filter);

  // 🔥 NEXT APPOINTMENT
  // const nextAppt = appointments.find(
  //   (a) => a.status === "BOOKED"
  // );


  // const nextAppt = appointments
  // .filter((a) => a.status === "BOOKED")
  // .sort((a, b) => {
  //   const aDateTime = new Date(`${a.date}T${a.time_slot}`);
  //   const bDateTime = new Date(`${b.date}T${b.time_slot}`);
  //   return aDateTime - bDateTime; // earliest first
  // })[0];

  const now = new Date();

  const today = new Date().toDateString();

  // ✅ STEP 1: Today appointments
  const todayAppt = appointments
    .filter((a) => {
      if (a.status !== "ARRIVED") return false;

      const apptDate = new Date(a.date).toDateString();
      return apptDate === today;
    })
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time_slot}`);
      const bTime = new Date(`${b.date}T${b.time_slot}`);
      return aTime - bTime;
    })[0];

  // ✅ STEP 2: Future appointments
  const futureAppt = appointments
    .filter((a) => {
      if (a.status !== "BOOKED") return false;

      const apptTime = new Date(`${a.date}T${a.time_slot}`);
      return apptTime > now;
    })
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time_slot}`);
      const bTime = new Date(`${b.date}T${b.time_slot}`);
      return aTime - bTime;
    })[0];

  // ✅ FINAL
  const nextAppt = todayAppt || futureAppt;

  const nextTime = nextAppt
  ? new Date(`${nextAppt.date}T${nextAppt.time_slot}`)
  : null;


  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          My Appointments
        </h1>

        <button
          onClick={() => {
            localStorage.removeItem("selected_doctor");
            navigate("/book");
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          + Book New Appointment
        </button>
      </div>

      {/* ✅ ACTIVE MESSAGE */}
      {appointments.some((a) => a.status === "BOOKED") && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-center">
          You have an active appointment
        </div>
      )}

      {/* ✅ NEXT APPOINTMENT CARD */}
      {nextAppt && (
        <div className="bg-blue-100 border border-blue-400 p-4 rounded mb-4">
          <h2 className="font-semibold text-lg">
            ⏳{todayAppt ? "Today's Appointment (Auto Selected)" : "Next Appointment (Auto Selected)"}
            {/* ⏳ Next Appointment  (Auto Selected) */}
          </h2>
          <p><b>Doctor:</b> {nextAppt.doctor_name}</p>
          <p><b>Date:</b> {nextAppt.date}</p>
          <p><b>Time:</b> {nextAppt.time_slot}</p>

          <button
            disabled={
              !nextAppt ||
              nextAppt.status !== "ARRIVED" ||
              (nextTime && nextTime > now)
            }
            onClick={() => {
              if (nextAppt.status !== "ARRIVED") {
                alert("⏳ Please check-in at reception first");
                return;
              }

              if (nextTime > now) {
                alert("⏳ Queue not started yet");
                return;
              }

              navigate(`/queue?doctor=${nextAppt.doctor}&token=${nextAppt.token_number}&name=${nextAppt.doctor_name}`);
            }}
            className="mt-2 bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            Track Queue
          </button>


        </div>
      )}

      {/* ✅ TABS */}
      <div className="flex gap-3 mb-4">
        {["ALL", "BOOKED", "COMPLETED", "CANCELLED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded ${
              filter === tab
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ❗ FIXED CONDITION */}
      {filteredAppointments.length === 0 ? (
        <p>No appointments found</p>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {

            const apptTime = appt?.date && appt?.time_slot
              ? new Date(`${appt.date}T${appt.time_slot}`)
              : null;


            const appNow = new Date();

            return (
              <div
                key={appt.id}
                id={appt.status === "BOOKED" ? "active-appt" : ""}
                className={`border p-4 rounded shadow transition-all duration-300 ${
                  appt.id === nextAppt?.id
                    ? "border-blue-500 bg-blue-50"
                    : appt.status === "BOOKED"
                    ? "border-green-500 bg-green-50 scale-[1.02]"
                    : "bg-white"
                }`}
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {appt.doctor_name}

                  {appt.status === "BOOKED" && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                </h2>

                <p>Date: {appt.date}</p>
                <p>Time: {appt.time_slot}</p>

                <p>
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      appt.status === "BOOKED"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {appt.status}
                  </span>
                </p>

                <p>Token: {appt.token_number}</p>

                <div className="flex gap-2 mt-3">

                  {/* TRACK */}
                  {appt.status === "BOOKED" && (
                    <button
                      disabled={appt.status !== "ARRIVED" || apptTime > appNow}
                      onClick={() => {

                        if (appt.status !== "ARRIVED") {
                          alert("⏳ Please check-in at reception first");
                          return;
                        }


                        if (apptTime > appNow) {
                          alert("⏳ Queue not started yet");
                          return;
                        }

                        navigate(`/queue?doctor=${appt.doctor}&token=${appt.token_number}&name=${appt.doctor_name}`);
                      }}
                      className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
                    >
                      Track Queue
                    </button>
                  )}

                  {/* SAME DOCTOR */}
                  <button
                    disabled={appt.status === "BOOKED"}
                    onClick={() => {
                      localStorage.setItem("selected_doctor", appt.doctor);
                      navigate("/book");
                    }}
                    className="bg-green-500 text-white px-3 py-1 rounded disabled:opacity-50"
                  >
                    Book Same Doctor
                  </button>
                </div>

                {/* CANCEL */}
                {appt.status === "BOOKED" && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Appointments;