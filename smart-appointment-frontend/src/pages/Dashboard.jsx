import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAppointments } from "../services/appointment";
import { Users, Calendar, Phone, Stethoscope, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);

  const fetchData = async () => {
    try {
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 5000); // every 5 sec
    return () => clearInterval(interval);
  }, []);

  const booked = appointments.filter(a => a.status === "BOOKED").length;
  const arrived = appointments.filter(a => a.status === "ARRIVED").length;
  const completed = appointments.filter(a => a.status === "COMPLETED").length;






  const managementItems = [
    {
      label: "Manage Doctors",
      icon: <Stethoscope size={28} />,
      path: "/doctors",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-600",
      hoverBg: "hover:bg-blue-100",
    },
    {
      label: "Manage Slots",
      icon: <Calendar size={28} />,
      path: "/slots",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200",
      iconColor: "text-cyan-600",
      hoverBg: "hover:bg-cyan-100",
    },

    {
      label: "Manage Specializations",
      icon: <Stethoscope size={28} />,
      path: "/specializations",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      iconColor: "text-purple-600",
      hoverBg: "hover:bg-purple-100",
    }


  ];

  const operationItems = [
    {
      label: "Reception Panel",
      icon: <Phone size={28} />,
      path: "/reception",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      iconColor: "text-emerald-600",
      hoverBg: "hover:bg-emerald-100",
    },
    {
      label: "Doctor Panel",
      icon: <Users size={28} />,
      path: "/doctor-panel",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
      iconColor: "text-teal-600",
      hoverBg: "hover:bg-teal-100",
    },
  ];

  const NavCard = ({ item }) => (
    <button
      onClick={() => navigate(item.path)}
      className={`group w-full p-6 rounded-lg border-2 ${item.bgColor} ${item.borderColor} ${item.hoverBg} transition-all duration-300 text-left hover:shadow-md hover:border-opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-3 rounded-lg bg-white border ${item.borderColor} ${item.iconColor}`}>
            {item.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {item.label}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {item.label.includes("Doctor") && item.label.includes("Manage")
                ? "Manage doctor profiles and credentials"
                : item.label.includes("Slot")
                ? "Configure appointment availability"
                : item.label.includes("Reception")
                ? "Check-in and appointment management"
                : "Patient consultation overview"}
            </p>
          </div>
        </div>
        <ArrowRight
          size={20}
          className={`flex-shrink-0 ${item.iconColor} group-hover:translate-x-1 transition-transform duration-300`}
        />
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle Header Background */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12">
          {/* Logo & Title */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
              ✦
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Medical Admin
            </h1>
          </div>
          <p className="text-slate-600 text-base max-w-xl ml-14">
            Manage hospital operations, doctor schedules, and patient appointments
            efficiently.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12">
        {/* Management Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-900">Management</h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              2 modules
            </span>
          </div>
          <div className="space-y-3">
            {managementItems.map((item, idx) => (
              <NavCard key={idx} item={item} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-slate-200 via-slate-300 to-transparent mb-12"></div>

        {/* Operations Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-900">Operations</h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              2 modules
            </span>
          </div>
          <div className="space-y-3">
            {operationItems.map((item, idx) => (
              <NavCard key={idx} item={item} />
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4">

          <button
            onClick={() => navigate("/reception")}
            className="bg-blue-500 text-white p-4 rounded"
          >
            🏥 Go to Reception
          </button>

          <button
            onClick={() => navigate("/doctor-queue")}
            className="bg-green-500 text-white p-4 rounded"
          >
            👨‍⚕️ View Doctor Queue
          </button>

        </div>

        {/* Quick Stats */}
        <div className="mt-16 pt-12 border-t border-slate-200/50">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-6">
            Quick Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "🟡", label: "Booked Patients", value: booked },
              { icon: "🟢", label: "Arrived (Queue)", value: arrived },
              { icon: "✅", label: "Completed Today", value: completed },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors duration-300"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                  <div className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </div>
                </div>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            💡 <span className="font-semibold">Tip:</span> All changes are automatically saved to the system. Contact support for any issues.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;