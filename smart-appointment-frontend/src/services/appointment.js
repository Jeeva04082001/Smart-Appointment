import API from "../api/api";

export const bookAppointments = (data) =>
  API.post("/appointments/book/",data);

export const getAppointments = () =>
  API.get("/appointments/");

export const cancelAppointment = (id) =>
  API.post(`/appointments/cancel/${id}/`);



// ✅ COMPLETE APPOINTMENT
export const completeAppointment = (id) =>
  API.post(`/appointments/complete/${id}/`);

// ✅ MARK EMERGENCY
export const markEmergency = (id) =>
  API.post(`/queue/emergency/${id}/`);



// 🔹 GET ALL
export const getSpecializations = () =>
  API.get("/specializations/");

// 🔹 CREATE
export const createSpecialization = (data) =>
  API.post("/specializations/create/", data);

// 🔹 UPDATE
export const updateSpecialization = (id, data) =>
  API.put(`/specializations/${id}/`, data);

// 🔹 DELETE
export const deleteSpecialization = (id) =>
  API.delete(`/specializations/${id}/delete/`);

export const markArrived = (id) =>
  API.post(`appointment/arrived/${id}/`);

export const markNoShow = (id) =>
  API.post(`appointment/mark-no-show/${id}/`)





// export const createDoctor = (data) =>
//   API.post(`/doctors/create/`,data);

// export const createDoctorUser = (data) =>
//   API.post(`doctors/create-user/`,data);






