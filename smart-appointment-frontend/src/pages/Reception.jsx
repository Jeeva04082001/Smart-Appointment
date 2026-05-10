import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { CheckCircle, XCircle, AlertTriangle, Clock, Search, X, Zap, Filter } from "lucide-react";
import { getAppointments, markArrived, markNoShow } from "../services/appointment";
import { getDoctors } from "../services/doctorService";
const Reception = () => {
  const [appointments, setAppointments] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [doctors, setDoctors] = useState([]);

  console.log(appointments,'appointments--');
  

  // 🔥 FETCH TODAY APPOINTMENTS
  const fetchAppointments = async () => {
    try {
      setError(null);

      let params = {};

      // DATE FILTER
      if (filterType === "today") {
        params.type = "today"
      }
      else if (filterType === "exact") {
        if (!selectedDate) {
          setAppointments([]);
          return;
        }
        params.date = selectedDate;
      }
       // DATE RANGE
      else if (filterType === "range") {
        // stop until both selected
        if (!fromDate || !toDate) {
          setAppointments([]);
          return;
        }
        params.from = fromDate;
        params.to = toDate;
      }

      // if (filterType === "exact" && selectedDate) params.date = selectedDate;


      // 🔥 NEW FILTERS
      if (statusFilter) params.status = statusFilter;
      if (doctorFilter) params.doctor = doctorFilter;
      if (search) params.search = search;

      const res = await getAppointments(params);
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch appointments. Please try again.");
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchAppointments();
    }, 300);

    return () => clearTimeout(delay);
  }, [filterType, selectedDate, fromDate, toDate, statusFilter, doctorFilter, search]);


  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);


  useEffect(() => {
  const fetchDoctors = async () => {
    try {
      const res = await getDoctors();
      setDoctors(res.data.doctors); // based on your API response
    } catch (err) {
      console.log(err);
    }
  };

  fetchDoctors();
}, []);

  const selectedDoctor = doctors.find(d => d.id == doctorFilter);

  // 🔥 CHECK-IN
  const handleCheckIn = async (id) => {
    setLoadingId(id);
    try {
      await markArrived(id);
      await fetchAppointments();
    } catch (err) {
      console.error(err);
      setError("Failed to mark arrival. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  // 🔥 NO SHOW
  const handleNoShow = async (id) => {
    setLoadingId(id);
    try {
      await markNoShow(id);
      await fetchAppointments();
    } catch (err) {
      console.error(err);
      setError("Failed to mark no-show. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  // Status Badge Styling
  const getStatusChip = (status) => {
    const statusConfig = {
      BOOKED: { label: "Booked", color: "info", icon: Clock },
      ARRIVED: { label: "Arrived", color: "success", icon: CheckCircle },
      COMPLETED: { label: "Completed", color: "default", icon: CheckCircle },
      NO_SHOW: { label: "No Show", color: "error", icon: XCircle },
    };

    const config = statusConfig[status] || {
      label: status,
      color: "default",
      icon: Clock,
    };

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
        sx={{
          fontWeight: 600,
          fontSize: "0.75rem",
        }}
      />
    );
  };

  // 📊 Statistics
  const stats = {
    total: appointments.length,
    booked: appointments.filter(a => a.status === "BOOKED").length,
    arrived: appointments.filter(a => a.status === "ARRIVED").length,
    emergency: appointments.filter(a => a.is_emergency).length,
    completed: appointments.filter(a => a.status === "COMPLETED").length
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDoctorFilter("");
    setFilterType("today");
  };

  const hasActiveFilters = search || statusFilter || doctorFilter || (filterType !== "today");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Container maxWidth="xl" className="py-10">
        {/* ========== HEADER ========== */}
        <Box className="mb-10">
          <Box className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg transform hover:scale-105 transition-transform">
              🏥
            </div>
            <Box>
              <Typography variant="h4" className="font-bold text-gray-800">
                Reception Panel
              </Typography>
              <Typography variant="body2" className="text-gray-500 mt-1">
                Real-time appointment management & patient check-ins
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ========== ERROR ALERT ========== */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)} 
            className="mb-6 rounded-lg"
            sx={{
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </Alert>
        )}

        {/* ========== STATS CARDS ========== */}
        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, icon: "📋", color: "from-blue-500 to-blue-600" },
            { label: "Booked", value: stats.booked, icon: "📅", color: "from-orange-500 to-orange-600" },
            { label: "Arrived", value: stats.arrived, icon: "✓", color: "from-green-500 to-green-600" },
            { label: "Completed", value: stats.completed, icon: "✅", color: "from-purple-500 to-purple-600" },
            { label: "Emergency", value: stats.emergency, icon: "🚨", color: "from-red-500 to-red-600" },
          ].map((stat, idx) => (
            <div 
              key={idx}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}
            >
              <div className="flex justify-between items-start">
                <Box>
                  <Typography variant="caption" className="text-white text-opacity-90 block">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" className="font-bold text-2xl mt-2">
                    {stat.value}
                  </Typography>
                </Box>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </Box>

        {/* ========== SEARCH & FILTERS ========== */}
        <div className="mb-8 space-y-4">
          {/* MAIN SEARCH BAR */}
          <div className="relative">
            <div className={`relative bg-white rounded-xl shadow-md overflow-hidden transition-all ${isSearchFocused ? "ring-2 ring-blue-500" : ""}`}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="🔍 Search by patient name, token, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-12 pr-12 py-4 text-gray-800 placeholder-gray-400 focus:outline-none text-base"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* FILTER SECTION */}
          <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
            {/* Toggle Filter Button */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-700 font-semibold hover:text-blue-600 transition-colors"
              >
                <Filter size={18} />
                Advanced Filters
                <span className={`text-sm transition-transform ${showFilters ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1"
                >
                  <X size={16} />
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Controls */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {/* Date Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Filter Type */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Date Filter</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors font-medium text-gray-800"
                    >
                      <option value="today">Today</option>
                      <option value="exact">Exact Date</option>
                      <option value="range">Date Range</option>
                      <option value="all">All Appointments</option>
                    </select>
                  </div>

                  {/* Exact Date */}
                  {filterType === "exact" && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Select Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Range From */}
                  {filterType === "range" && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Range To */}
                  {filterType === "range" && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Status & Doctor Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* STATUS */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors font-medium text-gray-800"
                    >
                      <option value="">All Status</option>
                      <option value="BOOKED">Booked</option>
                      <option value="ARRIVED">Arrived</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="NO_SHOW">No Show</option>
                    </select>
                  </div>

                  {/* DOCTOR */}
                  <div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
                        Doctor
                      </label>

                      <select
                        value={doctorFilter}
                        onChange={(e) => setDoctorFilter(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors font-medium text-gray-800"
                      >
                        <option value="">All Doctors</option>

                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.doctor_name} ({doc.specialization})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                {search && (
                  <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    🔍 {search}
                    <button onClick={() => setSearch("")} className="ml-1">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {statusFilter && (
                  <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    📊 {statusFilter}
                    <button onClick={() => setStatusFilter("")} className="ml-1">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {doctorFilter && selectedDoctor && (
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    👨‍⚕️ {selectedDoctor.doctor_name}
                    <button onClick={() => setDoctorFilter("")}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                {filterType !== "today" && (
                  <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                    📅 {filterType}
                    <button onClick={() => setFilterType("today")} className="ml-1">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== TABLE ========== */}
        <TableContainer
          component={Paper}
          className="shadow-2xl rounded-2xl overflow-hidden border border-gray-100"
          sx={{
            "& .MuiTable-root": {
              minWidth: 750,
            },
          }}
        >
          <Table aria-label="appointments table">
            <TableHead>
              <TableRow
                sx={{
                  background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
                  "& .MuiTableCell-head": {
                    fontWeight: 700,
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    padding: "18px 16px",
                    letterSpacing: "0.5px",
                  },
                }}
              >
                <TableCell>Token</TableCell>
                <TableCell>Patient Name</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Emergency</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {appointments && appointments.length > 0 ? (
                appointments.map((appt, index) => (
                  <TableRow
                    key={appt.id}
                    sx={{
                      "&:hover": {
                        backgroundColor: "#f0f9ff",
                      },
                      borderBottom: "1px solid #e2e8f0",
                      transition: "all 0.2s ease",
                      "& .MuiTableCell-body": {
                        padding: "18px 16px",
                        color: "#334155",
                      },
                    }}
                  >
                    {/* Token */}
                    <TableCell>
                      <Box className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow">
                        {appt.token_number}
                      </Box>
                    </TableCell>

                    {/* Patient Name */}
                    <TableCell>
                      <Typography variant="body2" className="font-semibold text-gray-800">
                        {appt.patient_name}
                      </Typography>
                      {appt.patient_phone && (
                        <Typography variant="caption" className="text-gray-500 text-xs">
                          📱 {appt.patient_phone}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center">
                      {getStatusChip(appt.status)}
                    </TableCell>

                    {/* Emergency */}
                    <TableCell align="center">
                      {appt.is_emergency ? (
                        <Chip
                          icon={<AlertTriangle size={16} />}
                          label="Emergency"
                          color="error"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                          }}
                        />
                      ) : (
                        <Typography variant="caption" className="text-gray-400">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <Box className="flex gap-2 justify-end">
                        {/* CHECK-IN */}
                        {appt.status === "BOOKED" && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleCheckIn(appt.id)}
                            disabled={loadingId === appt.id}
                            startIcon={
                              loadingId === appt.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <CheckCircle size={16} />
                              )
                            }
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              padding: "8px 14px",
                              fontSize: "0.85rem",
                              boxShadow: "0 2px 6px rgba(34, 197, 94, 0.2)",
                              "&:hover": {
                                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                              },
                            }}
                          >
                            {loadingId === appt.id ? "..." : "Check-In"}
                          </Button>
                        )}

                        {/* NO SHOW */}
                        {appt.status === "ARRIVED" && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleNoShow(appt.id)}
                            disabled={loadingId === appt.id}
                            startIcon={
                              loadingId === appt.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <XCircle size={16} />
                              )
                            }
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              padding: "8px 14px",
                              fontSize: "0.85rem",
                              borderColor: "#fca5a5",
                              color: "#991b1b",
                              "&:hover": {
                                backgroundColor: "#fee2e2",
                                borderColor: "#f87171",
                              },
                            }}
                          >
                            {loadingId === appt.id ? "..." : "No Show"}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ padding: "60px 20px" }}>
                    <Box className="flex flex-col items-center gap-3">
                      <Clock size={48} className="text-gray-300" />
                      <Typography variant="h6" className="text-gray-600 font-semibold">
                        No appointments found
                      </Typography>
                      <Typography variant="body2" className="text-gray-400">
                        {search ? `No results for "${search}"` : "No appointments scheduled for today"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ========== FOOTER INFO ========== */}
        <Box className="mt-8 px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-300 flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <Zap size={18} className="text-blue-600" />
            <Typography variant="body2" className="text-blue-700 font-semibold">
              Live Dashboard
            </Typography>
            <Typography variant="caption" className="text-blue-600 ml-2">
              Auto-refreshing every 5 seconds
            </Typography>
          </Box>
          <Typography variant="caption" className="text-blue-600">
            Showing {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      </Container>
    </div>
  );
};

export default Reception;