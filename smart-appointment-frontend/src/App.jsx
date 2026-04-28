import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import Doctors from "./pages/Doctors";
import BookAppointment from "./pages/BookAppointment";
import Appointments from "./pages/Appointments";
import Queue from "./pages/Queue";
import DoctorDashboard from "./pages/DoctorDashboard";
import { Toaster } from "react-hot-toast";
import ReceptionDashboard from "./pages/ReceptionDashboard";
import QueueDisplay from "./pages/QueueDisplay";
import Reception from "./pages/Reception";
import Specializations from "./pages/Specializations";
import Slots from "./pages/Slots";
import Register from "./pages/Register";
import DoctorQueue from "./pages/DoctorQueue";
import AdminAppointments from "./pages/AdminAppointments";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e293b",
            color: "#fff",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctors"
          element={
            <ProtectedRoute>
              <Doctors />
            </ProtectedRoute>
          }
        />

        <Route path="/book" element={<BookAppointment />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/reception-dashboard" element={<ReceptionDashboard />} />
        <Route path="/display" element={<QueueDisplay />} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/specializations" element={<Specializations />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/doctor-queue" element={<DoctorQueue />} />
        <Route path="/admin-appointments" element={<AdminAppointments />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;


