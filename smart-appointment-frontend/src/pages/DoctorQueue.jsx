import { useEffect, useState } from "react";
import API from "../api/api";
import {
  completeAppointment,
  markEmergency,
} from "../services/appointment";

import { viewQueue,nextPatient } from "../services/doctorService";

function DoctorQueue() {
  const doctorId = localStorage.getItem("doctor_id");

  const [queue, setQueue] = useState([]);

  console.log(queue,'queue------------');
  
  const [loadingId, setLoadingId] = useState(null);
  // const [emergencyNotified, setEmergencyNotified] = useState(false);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [lastEmergencyId, setLastEmergencyId] = useState(null);

  useEffect(() => {
    fetchQueue();

    let ws;

    const connect = () => {
      ws = new WebSocket(`ws://127.0.0.1:8011/ws/queue/${doctorId}/`);

      ws.onopen = () => {
        console.log("WS Connected");
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)){
          setQueue(data)
        }
        else {
          fetchQueue();
        }
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
        ws.close();
      };

      ws.onclose = () => {
        console.log("WS Disconnected. Reconnecting...");
        setWsStatus("disconnected");
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close(); // 🔥 cleanup
    };

  }, [doctorId]);


  // // 🔥 FETCH + WEBSOCKET
  // useEffect(() => {
  //   fetchQueue();

  //   const ws = new WebSocket(
  //     `ws://localhost:8011/ws/queue/${doctorId}/`
  //   );

  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     console.log("WS DATA:", data); 
  //     setQueue(data);

  //     // 🔥 AUTO SCROLL EMERGENCY
  //     setTimeout(() => {
  //       const el = document.querySelector(".emergency-item");
  //       if (el) el.scrollIntoView({ behavior: "smooth" });
  //     }, 200);


  //   };

  //   return () => ws.close();
  // }, [doctorId]);

  const fetchQueue = async () => {
    try {
      const res = await viewQueue(doctorId);
      setQueue(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ▶️ NEXT PATIENT
  const handleNext = async () => {
    try {
      await nextPatient(doctorId);
      fetchQueue()
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ COMPLETE
  const handleComplete = async (appointmentId) => {
    const confirm = window.confirm("Mark this patient as completed?");
    if (!confirm) return;

    try {

      if (!appointmentId) {
        console.error("No appointment ID");
        return;
      }


      setLoadingId(appointmentId);

      await completeAppointment(appointmentId);

      // optional refresh
      fetchQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  // ⚠️ EMERGENCY
  const handleEmergency = async (queueId) => {

    console.log(queueId,'queueId');

    const confirm = window.confirm(
      "Mark this patient as EMERGENCY?"
    );

    if (!confirm) return;

    try {
      setLoadingId(queueId);

      await markEmergency(queueId);

      fetchQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const currentServing = queue.find((q) => q.is_serving);

  const playEmergencySound = () => {
    const audio = new Audio("/alert.mp3");
    audio.play();
  };

  // useEffect(() => {
  //   const emergencyExists = queue.some(q => q.is_emergency);

  //   if (emergencyExists && !emergencyNotified) {
  //     playEmergencySound();
  //     setEmergencyNotified(true);
  //   }
  // }, [queue, emergencyNotified]);

  useEffect(() => {
    const emergency = queue.find(q => q.is_emergency);

    if (emergency && emergency.id !== lastEmergencyId) {
      new Audio("/alert.mp3").play().catch(()=>{});
      setLastEmergencyId(emergency.id);
    }
  }, [queue]);

  // const today = new Date().toISOString().split("T")[0];
  const today = new Date().toLocaleDateString("en-CA");
  // const filteredQueue = queue.filter((q) => {
  //   return q.date === today;
  // });

  // console.log(filteredQueue,'filteredQueue---------');
  




  const sortedQueue = [...queue].sort((a, b) => {
    if (b.is_emergency !== a.is_emergency) {
      return b.is_emergency - a.is_emergency;
    }
    return a.token - b.token;
  });

  console.log(sortedQueue,'sortedQueue--------');
  

  useEffect(() => {
    const el = document.querySelector(".emergency-item");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [queue]);

  return (
    <div className="p-6 max-w-3xl mx-auto">

      <h1 className="text-2xl font-bold text-center mb-6">
        Doctor Queue Dashboard
      </h1>

      <p className={`text-center mb-3 ${
        wsStatus === "connected" ? "text-green-600" : "text-red-600"
      }`}>
        {wsStatus === "connected" ? "🟢 Live" : "🔴 Disconnected"}
      </p>



      {/* 🔥 CURRENT */}
      <div className="bg-green-100 p-4 rounded mb-4 text-center">
        <p>
          Current Token:{" "}
          <b>{currentServing ? currentServing.token : "None"}</b>
        </p>
      </div>

      {/* ▶️ NEXT */}
      <button
        onClick={handleNext}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-6"
      >
        Next Patient ▶️
      </button>

      {/* 📋 QUEUE */}
      <div className="space-y-3">
        {sortedQueue.length === 0 && (
          <p className="text-center text-gray-500">
            No patients in queue
          </p>
        )}

        {sortedQueue.map((q) => (
          <div
            key={q.id}
            className={`p-4 rounded border transition-all duration-300 ${
              q.is_serving
                ? "bg-green-300 border-green-500 scale-[1.02] animate-pulse"
                : q.is_emergency
                ? "bg-red-200 border-red-500 emergency-item scale-[1.02]"
                : "bg-gray-100"
            }`}
          >
            <div className="flex justify-between items-center">

              <div>
                <p className="font-semibold">
                  Token #{q.token}
                </p>

                <p className="text-sm text-gray-600">
                  {q.patient}
                </p>

                {/* ✅ ADD HERE */}
                {q.is_emergency && (
                  <p className="text-red-600 font-bold animate-pulse">
                    🚨 Emergency
                  </p>
                )}



                {q.is_serving && (
                  <p className="text-green-700 text-sm">
                    🔥 Now Serving
                  </p>
                )}
              </div>

              <div className="flex gap-2">

                {/* ✅ COMPLETE */}
                <button
                  // disabled={loadingId === q.appointment_id}
                  disabled={loadingId !== null}
                  onClick={() =>
                    handleComplete(q.appointment_id)
                  }
                  className="bg-green-500 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                  {loadingId === q.appointment_id
                    ? "..."
                    : "Complete"}
                </button>

                {/* ⚠️ EMERGENCY */}
                <button
                  // disabled={loadingId === q.id || q.is_emergency}
                  disabled={loadingId !== null || q.is_emergency}
                  onClick={() => handleEmergency(q.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                  {loadingId === q.id
                    ? "..."
                    : "Emergency"}
                </button>

              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default DoctorQueue;