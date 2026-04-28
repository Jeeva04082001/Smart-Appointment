import React, { useEffect, useState } from "react";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Lock,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { getSpecializations } from "../services/appointment";
import {saveDoctor, createDoctor as createDoctorAPI, createDoctorUser, getDoctors, deleteDoctor, updateDoctor } from "../services/doctorService";
import toast from "react-hot-toast";


const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctor_name: "",
    specialization: "",
    experience: "",
    hospital_name: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState([]);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // 🔥 FETCH DOCTORS
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await getDoctors(page, search);
      setDoctors(res.data.doctors || []);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error(err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const res = await getSpecializations();
      console.log("SPECIALIZATION API:", res.data);
      setSpecializations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchSpecializations();
  }, [page, search]);

  // 🔥 HANDLE INPUT
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔥 CREATE/UPDATE DOCTOR
  // const createDoctor = async () => {
  //   if (
  //     !form.doctor_name ||
  //     !form.specialization ||
  //     !form.experience ||
  //     !form.hospital_name
  //   ) {
  //     alert("Please fill all fields");
  //     return;
  //   }

  //   try {
  //     if (editMode) {
  //       await updateDoctor(selectedDoctorId, {
  //         ...form,
  //         specialization: Number(form.specialization),
  //       });
  //       alert("Doctor updated");
  //     } else {
  //       await createDoctorAPI({
  //         ...form,
  //         specialization: Number(form.specialization),
  //       });
  //       alert("Doctor created");
  //     }

  //     setEditMode(false);
  //     setSelectedDoctorId(null);
  //     setForm({
  //       doctor_name: "",
  //       specialization: "",
  //       experience: "",
  //       hospital_name: "",
  //     });

  //     setShowForm(false);
  //     fetchDoctors();
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to create doctor");
  //   }
  // };


 const handleSaveDoctor = async () => {
    if (
      !form.doctor_name ||
      !form.specialization ||
      !form.experience ||
      !form.hospital_name
    ) {
      toast.error("Please fill all fields");
      return;
    }
    setSaving(true);

    try {
      await saveDoctor({
        ...form,
        specialization: Number(form.specialization),
        id: editMode ? selectedDoctorId : null,
      });

      toast.success(editMode ? "Doctor updated successfully" : "Doctor created successfully");

      // 🔥 reset everything
      setEditMode(false);
      setSelectedDoctorId(null);
      setForm({
        doctor_name: "",
        specialization: "",
        experience: "",
        hospital_name: "",
      });

      setShowForm(false);
      fetchDoctors();

    } catch (err) {
      console.error(err.response?.data);
      toast.error("Operation failed");
    } finally {
      setSaving(false); // 🔥 END
    }
  };




  // 🔥 CREATE DOCTOR LOGIN
  const handleCreateLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      toast.error("Please fill username and password");
      return;
    }

    try {
      await createDoctorUser({
        doctor_id: selectedDoctor,
        username: loginForm.username,
        password: loginForm.password,
      });

      toast.success("Doctor login created");
      setShowLoginModal(false);
      setLoginForm({ username: "", password: "" });
    } catch (err) {
      console.error(err);
      // 🔥 IMPORTANT FIX
      const message =
        err.response?.data?.error ||   // your backend error
        err.response?.data?.detail ||  // django default
        "Failed to create login";

      toast.error(message);

    }
  };



  // 🔥 HANDLE EDIT
  const handleEdit = (doc) => {
    setForm({
      doctor_name: doc.doctor_name,
      specialization: doc.specialization_id,
      experience: doc.experience,
      hospital_name: doc.hospital_name,
    });
    setSelectedDoctorId(doc.id);
    setEditMode(true);
    setShowForm(true);
  };

  // 🔥 CANCEL FORM
  const handleCancelForm = () => {
    setShowForm(false);
    setEditMode(false);
    setSelectedDoctorId(null);
    setForm({
      doctor_name: "",
      specialization: "",
      experience: "",
      hospital_name: "",
    });
  };


  const handleDeleteDoctor = async () => {
    try {
      await deleteDoctor(doctorToDelete.id);
      toast.success("Doctor deleted");

      setShowDeleteModal(false);
      setDoctorToDelete(null);
      fetchDoctors();
    } catch (err) {
      toast.error("Delete failed");
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white text-lg">
                👨‍⚕️
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                Manage Doctors
              </h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-semibold"
            >
              <Plus size={20} />
              Add Doctor
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search doctor by name or specialization..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Add Doctor Form */}
        {showForm && (
          <div className="mb-8 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editMode ? "Edit Doctor" : "Add New Doctor"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Doctor Name
                </label>
                <input
                  type="text"
                  name="doctor_name"
                  placeholder="Enter doctor name"
                  value={form.doctor_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Specialization
                </label>
                <select
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Specialization</option>
                  {specializations?.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Experience (Years)
                </label>
                <input
                  type="text"
                  name="experience"
                  placeholder="Enter years of experience"
                  value={form.experience}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Hospital Name
                </label>
                <input
                  type="text"
                  name="hospital_name"
                  placeholder="Enter hospital name"
                  value={form.hospital_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveDoctor}
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-300
                  ${saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}
                `}
              >
                {saving
                  ? "Saving..."
                  : editMode
                  ? "Update Doctor"
                  : "Create Doctor"}
              </button>
              <button
                onClick={handleCancelForm}
                className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors duration-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Doctor List */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Doctor List</h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              Loading doctors...
            </div>
          ) : !doctors || doctors.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              No doctors found. Add your first doctor to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Specialization
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Experience
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Hospital
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {doctors.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {doc.doctor_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {doc.doctor_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {doc.specialization}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700 font-medium">
                          {doc.experience} yrs
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600">{doc.hospital_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDoctor(doc.id);
                              setLoginForm({ username: "", password: "" }); 
                              setShowLoginModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors duration-300 text-sm font-semibold"
                            title="Create Login"
                          >
                            <Lock size={16} />
                          </button>

                          <button
                            onClick={() => handleEdit(doc)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300 text-sm font-semibold"
                            title="Edit Doctor"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={async () => {
                              // setDoctorToDelete(doc.id);
                              setDoctorToDelete({
                                id: doc.id,
                                name: doc.doctor_name
                              });

                              setShowDeleteModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-300 text-sm font-semibold"
                            title="Delete Doctor"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {doctors.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Page <span className="font-semibold">{page}</span>
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 font-semibold"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 font-semibold"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                Create Doctor Login
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors duration-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLogin}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-300 font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}


      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 shadow-lg p-6">
            
            <h2 className="text-lg font-bold mb-2 text-gray-800">
              Delete Doctor
            </h2>

            <p className="text-gray-600 mb-6">
              Delete <b>{doctorToDelete?.name}</b>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteDoctor}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;