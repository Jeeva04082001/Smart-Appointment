import { useEffect, useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { cancelAppointment } from "../services/appointment";
import { useLocation } from "react-router-dom";


function Queue() {
  const navigate = useNavigate();
  // const tokenNumber = Number(localStorage.getItem("guest_token"));
  // const doctorId = localStorage.getItem("guest_doctor");
  const [tokenNumber, setTokenNumber] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [queue, setQueue] = useState([]);
  const [notified, setNotified] = useState(false);
  const [completed, setCompleted] = useState(false);
  const role = localStorage.getItem("role");
    // 🔥 CURRENT SERVING
  const currentServing = queue.find((q) => q.is_serving);
  const currentToken = currentServing ? currentServing.token : 0;
  const [lastCalledToken, setLastCalledToken] = useState(null);
  const [doctorName, setDoctorName] = useState("");
  const [remainingTime, setRemainingTime] = useState(null);

  const [preNotified, setPreNotified] = useState(false);
  const avgTime = 5;
  const patientsAhead = tokenNumber ? queue.filter((q) => q.token < tokenNumber).length : 0;

  const waitTime = patientsAhead * avgTime;

  const location = useLocation();
  const query = new URLSearchParams(location.search);

  const doctorFromUrl = query.get("doctor");
  const tokenFromUrl = query.get("token");
  const nameFromUrl = query.get("name");



  // useEffect(() => {
  //   const token = localStorage.getItem("guest_token");
  //   const doctor = localStorage.getItem("guest_doctor");

  //   if (token && doctor) {
  //     setTokenNumber(Number(token));
  //     setDoctorId(doctor);
  //   } else {
  //     fetchAppointmentData(); // 🔥 fallback
  //   }
  // }, []);

  useEffect(() => {
    if (doctorFromUrl && tokenFromUrl) {
      setDoctorId(doctorFromUrl);
      setTokenNumber(Number(tokenFromUrl));
      setDoctorName(nameFromUrl);
    } else {
      fetchAppointmentData(); // fallback
    }
  }, []);

  useEffect(() => {
    if (currentToken && currentToken !== lastCalledToken) {
      speakToken(currentToken, doctorName);  // 🔥 announce current serving
      setLastCalledToken(currentToken);
    }
  }, [currentToken]);


  const fetchAppointmentData = async () => {
    try {
      const res = await API.get("/appointments/");

      const now = new Date();

      const active = res.data
      .filter((a) => {
          if (a.status !== "BOOKED") return false;

            const apptTime = new Date(`${a.date}T${a.time_slot}`);
            return apptTime <= now; // 🔥 ONLY CURRENT OR PAST (today active)
          })
          .sort((a, b) => {
            const aTime = new Date(`${a.date}T${a.time_slot}`);
            const bTime = new Date(`${b.date}T${b.time_slot}`);
            return bTime - aTime; // latest active
          })[0];
      console.log(active,'active');
      

      if (active) {

        // 🔥 ADD THIS HERE
        if (active.status !== "ARRIVED") {
          toast("⏳ Please check-in at reception first");
          navigate("/appointments");
          return;
        }


        const apptTime = new Date(`${active.date}T${active.time_slot}`);
        const now = new Date();

        // 🚨 BLOCK FUTURE APPOINTMENT
        if (apptTime > now) {
          toast("⏳ This appointment is scheduled for later");
          navigate("/appointments");
          return;
        }


        setTokenNumber(active.token_number);
        setDoctorId(active.doctor);
        setDoctorName(active.doctor_name);
      } else {
        navigate("/book");
      }
    } catch (err) {
      console.error(err);
    }
  };




  // 🔥 INITIAL FETCH (IMPORTANT)
  useEffect(() => {

    if (!doctorId) return; // 🔥 STOP NULL CALL

    fetchQueue();

    const ws = new WebSocket(
      `ws://localhost:8011/ws/queue/${doctorId}/`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setQueue(data);
    };

    // ✅ mark page loaded AFTER short delay
    setTimeout(() => {
      setPageLoaded(true);
    }, 1000);



    return () => ws.close();
  }, [doctorId]);

  // const stillInQueue = queue.some(
  //   (q) => q.token === tokenNumber && q.is_serving
  // );

  useEffect(() => {
    if (completed) return;

    const stillInQueue = queue.some(
      (q) => q.token === tokenNumber
    );

    if (!stillInQueue && queue.length > 0) {
      toast.success("Appointment Completed")
      setCompleted(true);
      navigate("/appointments");
    }
  }, [queue,tokenNumber]);

  // useEffect(() => {
  //   if (currentToken === tokenNumber && !notified) {
  //     alert("It's your turn!");
  //     playSound();
  //     setNotified(true);
  //   }
  // }, [currentToken, notified]);

  useEffect(() => {
    if (
      pageLoaded &&
      currentToken === tokenNumber &&
      !notified
    ) {
      toast.success(`🔔 It's your turn for ${doctorName}!`, {
        duration: 4000,
      });

      // // 🔊 play sound
      // const audio = new Audio("/bell.mp3");
      // audio.play();

      // setNotified(true);

      playBeep(); // already added earlier

      // 🔊 VOICE ALERT
      speakToken(tokenNumber, doctorName);

      setNotified(true);
    }
  }, [currentToken, notified, pageLoaded, doctorName,tokenNumber]);


  const fetchQueue = async () => {
    try {
      const res = await API.get(`/queue/${doctorId}/`);
      setQueue(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // const playSound = () => {
  //   const audio = new Audio("/bell.mp3");
  //   // audio.play();
  //   udio.play().catch((e) => console.log("Audio blocked", e));
  // };


  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();

      setTimeout(() => {
        oscillator.stop();
      }, 300);
    } catch (e) {
      console.log("Beep failed", e);
    }
  };



  const playSound = () => {
    try {
      const audio = new Audio("/bell.mp3");
      audio.play();
    } catch {
      playBeep(); // fallback
    }
  };
 

  const handleCancel = async () => {
    try {
      // 🔥 get appointment id from backend
      const res = await API.get("/appointments/");
      
      const selected = res.data.find(
        (a) =>
          a.status === "BOOKED" &&
          a.doctor == doctorId &&
          a.token_number == tokenNumber
      );

      if (!selected) {
        toast.error("No matching appointment found");
        return;
      }

      await cancelAppointment(selected.id);

      toast.success("Appointment Cancelled ❌");

      // 🔥 cleanup
      localStorage.removeItem("guest_token");
      localStorage.removeItem("guest_doctor");

      navigate("/appointments");

    } catch (err) {
      console.error(err);
      toast.error("Cancel failed ❌");
    }
  };

  const isNext =
  patientsAhead === 1 && currentToken !== tokenNumber;


  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await API.get("/appointments/");

        const now = new Date();

        const next = res.data
          .filter((a) => {
            if (a.status !== "BOOKED") return false;
            const t = new Date(`${a.date}T${a.time_slot}`);
            // return t >= now;
            const today = new Date().toDateString();
            return new Date(a.date).toDateString() === today;

          })
          .sort((a, b) => {
            const aTime = new Date(`${a.date}T${a.time_slot}`);
            const bTime = new Date(`${b.date}T${b.time_slot}`);
            return aTime - bTime;
          })[0];

        // 🔥 switch automatically
        if (
          next &&
          (next.doctor != doctorId ||
            next.token_number != tokenNumber)
        ) {
          setDoctorId(next.doctor);
          setTokenNumber(next.token_number);
          setDoctorName(next.doctor_name);
          setNotified(false);
          setPreNotified(false);
        }

      } catch (err) {
        console.error(err);
      }
    }, 10000); // every 10 sec

    return () => clearInterval(interval);
  }, [doctorId, tokenNumber]);


  useEffect(() => {
    if (!doctorId || !tokenNumber) return;

    const interval = setInterval(() => {
      const now = new Date();

      // 🔥 assume each token = 5 mins
      const timeLeft = patientsAhead * 5;

      setRemainingTime(timeLeft);
    }, 3000);

    return () => clearInterval(interval);
  }, [patientsAhead]);


  useEffect(() => {
    if (preNotified) return;

    // 🔥 5 mins before turn
    if (patientsAhead === 1) {
      // toast("⏳ Your turn is coming in ~5 minutes");

      toast.success("⏳ Your turn is coming in ~5 minutes", {
        duration: 4000,
      });

      // 🔊 optional sound
      const audio = new Audio("/bell.mp3");
      audio.play();

      setPreNotified(true);

      speakToken(tokenNumber, doctorName);
    }
  }, [patientsAhead, preNotified]);



  const speakToken = (token, doctor) => {
    try {
      const msg = new SpeechSynthesisUtterance(
        `Token number ${token}, please go to Doctor ${doctor}`
      );

      msg.lang = "en-IN"; // Indian accent
      msg.rate = 1;       // speed
      msg.pitch = 1;


      // 🔥 ADD THIS HERE
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.lang === "en-IN");

      if (selectedVoice) {
        msg.voice = selectedVoice;
      }

      window.speechSynthesis.speak(msg);

     
    } catch (e) {
      console.log("Voice failed", e);
    }
  };







   if (!tokenNumber || !doctorId) {
    // toast.loading("Fetching queue...");
    return <p>Loading queue...</p>;
  }


  return (
    <div className="p-6 max-w-2xl mx-auto">

      <div className="sticky top-0 bg-white z-10 flex justify-between items-center mb-6 py-3">
        <h1 className="text-2xl font-bold">
          Queue Status
        </h1>

        
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/")}
            className="bg-gray-400 text-white px-3 py-2 rounded"
          >
            Home
          </button>

          {role && (
            <button
              onClick={() => navigate("/appointments")}
              className="bg-gray-500 text-white px-3 py-2 rounded"
            >
              My Appointments
            </button>
          )}
      </div>

      </div>

      {isNext && (
        <div className="bg-yellow-400 text-black p-3 rounded text-center mb-4">
          ⏳ You are next!
        </div>
      )}


      {currentToken === tokenNumber && (
        <div className="bg-green-500 text-white p-3 rounded text-center mb-4 animate-pulse">
          🔔 It's your turn!
        </div>
      )}


      {/* 🔥 VIEWING INFO */}
      <div className="bg-gray-100 p-3 rounded mb-4 flex justify-between items-center">
        <p>
          Viewing: <b>{doctorName}</b>
        </p>

        <button
          onClick={() => navigate("/appointments")}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Switch Appointment
        </button>
      </div>





      {/* 🧾 SUMMARY */}
      <div className="bg-blue-100 p-4 rounded mb-6 text-center">
        <p>Doctor: <b>{doctorName}</b></p>
        <p>Your Token: <b>{tokenNumber}</b></p>
        <p>Current Token: <b>{currentToken}</b></p>
        <p>Patients Ahead: <b>{patientsAhead}</b></p>
        <p>
          Estimated Wait: <b>{remainingTime ?? waitTime} mins</b>
        </p>

        {currentToken !== tokenNumber && (
        <button
          onClick={() => {
            if (patientsAhead <= 1) {
              toast.error("❌ Cannot cancel when your turn is near");
              return;
            }
            handleCancel();
          }}
          disabled={patientsAhead <= 1}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Cancel Appointment
        </button>


      )}
      
      </div>
      
     
     

      



      {/* 📋 QUEUE LIST */}
      <div className="space-y-3">
        {queue.map((q) => (
          <div
            key={q.id}   // ✅ FIXED
            className={`p-3 rounded border ${
              q.is_serving
                ? "bg-green-200 border-green-500"
                : "bg-gray-100"
            }`}
          >
            <p>
              Token #{q.token}
              {q.token === tokenNumber && " (You)"}
            </p>

            {q.is_serving && (
              <p className="text-green-700 font-semibold">
                🔥 Now Serving
              </p>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

export default Queue;