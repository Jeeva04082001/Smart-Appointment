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
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { getAppointments, markArrived, markNoShow } from "../services/appointment";

const Reception = () => {
  const [appointments, setAppointments] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  // 🔥 FETCH TODAY APPOINTMENTS
  const fetchAppointments = async () => {
    try {
      setError(null);
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch appointments. Please try again.");
    }
  };

  useEffect(() => {
    fetchAppointments();

    // 🔥 AUTO REFRESH EVERY 5s
    const interval = setInterval(fetchAppointments, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <Container maxWidth="lg" className="py-8">
      {/* Header */}
      <Box className="mb-8">
        <Box className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
            🏥
          </div>
          <Typography variant="h4" className="font-bold text-gray-800">
            Reception Panel
          </Typography>
        </Box>
        <Typography variant="body2" className="text-gray-500">
          Manage today's appointments and patient check-ins
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} className="mb-6">
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer
        component={Paper}
        className="shadow-lg rounded-xl overflow-hidden border border-gray-200"
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
                backgroundColor: "#f8fafc",
                borderBottom: "2px solid #e2e8f0",
                "& .MuiTableCell-head": {
                  fontWeight: 700,
                  color: "#1e293b",
                  fontSize: "0.95rem",
                  padding: "16px",
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
                      backgroundColor: "#f1f5f9",
                    },
                    borderBottom: "1px solid #e2e8f0",
                    transition: "background-color 0.2s ease",
                    "& .MuiTableCell-body": {
                      padding: "16px",
                      color: "#334155",
                    },
                  }}
                >
                  {/* Token */}
                  <TableCell>
                    <Box className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-md">
                      {appt.token_number}
                    </Box>
                  </TableCell>

                  {/* Patient Name */}
                  <TableCell>
                    <Typography variant="body2" className="font-semibold text-gray-800">
                      {appt.patient_name}
                    </Typography>
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
                            padding: "6px 12px",
                            fontSize: "0.85rem",
                            boxShadow: "0 2px 4px rgba(34, 197, 94, 0.2)",
                            "&:hover": {
                              boxShadow: "0 4px 8px rgba(34, 197, 94, 0.3)",
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
                            padding: "6px 12px",
                            fontSize: "0.85rem",
                            "&:hover": {
                              backgroundColor: "#fee2e2",
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
                <TableCell colSpan={5} align="center" sx={{ padding: "40px" }}>
                  <Box className="flex flex-col items-center gap-2">
                    <Clock size={32} className="text-gray-300" />
                    <Typography variant="body2" className="text-gray-500">
                      No appointments scheduled for today
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer Info */}
      <Box className="mt-6 px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
        <Typography variant="caption" className="text-blue-700">
          ✨ Auto-refreshing every 5 seconds
        </Typography>
      </Box>
    </Container>
  );
};

export default Reception;