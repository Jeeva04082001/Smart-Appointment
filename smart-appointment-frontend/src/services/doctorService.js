import { data } from "react-router-dom";
import API from "../api/api";

// 🔹 GET DOCTORS LIST (with pagination + search)
export const getDoctors = (page = 1, search = "", specialization = "") => {
  let url = `/doctors/?page=${page}&search=${search}`;

  if (specialization) {
    url += `&specialization=${specialization}`;
  }

  return API.get(url);
};

// 🔹 GET SINGLE DOCTOR
export const getDoctorDetail = (id) =>
  API.get(`/doctors/${id}/`);

// 🔹 CREATE DOCTOR
export const createDoctor = (data) =>
  API.post("/doctors/create/", data);

// 🔹 CREATE DOCTOR USER (LOGIN)
export const createDoctorUser = (data) =>
  API.post("/doctors/create-user/", data);


export const updateDoctor = (id, data) =>
  API.put(`/doctors/${id}/update/`, data);

export const deleteDoctor = (id) =>
  API.delete(`/doctors/${id}/delete/`);

export const saveDoctor = (data) => {
  return API.post('/doctors/save/', data);  // ✅ Correct endpoint
};

export const viewQueue = (id) =>
  API.get(`/queue/${id}/`);

export const nextPatient = (id) =>
  API.post(`/queue/next/${id}/`);



// export const saveDoctor = (data) =>
//   API.post("/doctors/save/", data);
