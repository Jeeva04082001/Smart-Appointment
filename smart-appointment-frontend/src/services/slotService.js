// services/slotService.js

import API from "../api/api";

export const createAvailability = (data) =>
  API.post("/availability/create/", data);

export const getSlots = (doctorId, date) =>
  API.get(`/slots/${doctorId}/?date=${date}`);



export const createLeave = (data) =>
  API.post("/leave/create/", data);


export const getMonthlySummary = (doctorId, month) => {
  return API.get(`/monthly-summary/${doctorId}/?month=${month}`);
};



