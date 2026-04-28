// src/pages/Register.jsx
import { useState } from "react";
import { TextField, Button, MenuItem } from "@mui/material";
import { registerUser } from "../services/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    phone: "",
    role: "PATIENT",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await registerUser(form);
      toast.success(res.data.message);
    //   alert(res.data.message);
      navigate("/"); 
    } catch (err) {
      console.log(err.response.data);
      alert("Error");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow w-96 space-y-4">
        <h2 className="text-2xl font-bold text-center">Register</h2>

        <TextField label="Username" name="username" fullWidth onChange={handleChange}/>
        <TextField label="Email" name="email" fullWidth onChange={handleChange}/>
        <TextField label="Phone" name="phone" fullWidth onChange={handleChange}/>
        <TextField label="Password" name="password" type="password" fullWidth onChange={handleChange}/>

        <TextField
          select
          label="Role"
          name="role"
          value={form.role}
          onChange={handleChange}
          fullWidth
        >
          <MenuItem value="PATIENT">Patient</MenuItem>
          <MenuItem value="DOCTOR">Doctor</MenuItem>
          <MenuItem value="ADMIN">Admin</MenuItem>
        </TextField>

        <Button variant="contained" fullWidth onClick={handleSubmit}>
          Register
        </Button>
      </div>
    </div>
  );
}