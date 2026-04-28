import { useState } from "react";
import { loginUser } from "../services/auth";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getAppointments } from "../services/appointment";

function Login() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await loginUser(form);

    console.log(res.data,'ddddddd');
    

    const token = res.data.access;
    const role = res.data.role; // ✅ direct
    const doctorId = res.data.doctor_id; 

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    if (doctorId) {
      localStorage.setItem("doctor_id", doctorId);
    }


    console.log(role);

    alert("Login successful ✅");

    if (role === "ADMIN") {
      navigate("/dashboard");
    } 
    else if (role === "DOCTOR") {
      navigate("/doctor");  // ✅ doctor dashboard
    } 
    else {
      // 👇 PATIENT FLOW FIX
      const apptRes = await getAppointments();
      const active = apptRes.data.find(
      (a) => a.status === "BOOKED"
      );

      if (active){
        // 🔥 STORE for queue page
        localStorage.setItem("guest_token", active.token_number);
        localStorage.setItem("guest_doctor", active.doctor)
        
        navigate("/queue")
      }
      else if (apptRes.data.length > 0) {
        navigate("/appointments");   // ✅ already booked
      } else {
        navigate("/book");           // ✅ new booking
      }
    }

  } catch (err) {
    alert("Invalid credentials ❌");
  }
};


  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-80"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Smart Appointment
        </h2>

        <input
          type="text"
          placeholder="Username"
          className="border p-2 w-full mb-4 rounded"
          onChange={(e) =>
            setForm({ ...form, username: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full mb-4 rounded"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button className="bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600">
          Login
        </button>

        <p className="text-sm mt-4 text-center">
          Don’t have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>

        <p
          className="text-center text-blue-500 cursor-pointer mt-2"
          onClick={() => {
            localStorage.removeItem("token"); // ✅ remove token
            localStorage.removeItem("role");  // (if stored)
            navigate("/book");
          }}
        >
          Continue as Guest
        </p>
      </form>
    </div>
  );
}

export default Login;


