import API from "../api/api";

export const getDoctors = () =>
  API.get("/doctors/");

// export const DoctorsList = (data) =>
//   API.get("/doctors/",data);


