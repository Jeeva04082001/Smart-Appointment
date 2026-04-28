import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../api/api";
import { Plus, Edit2, Trash2, X, Check, AlertCircle } from "lucide-react";

import { getSpecializations,createSpecialization,updateSpecialization,deleteSpecialization } from "../services/appointment";


const Specializations = () => {
  const [specializations, setSpecializations] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // 🔥 FETCH
  const fetchSpecs = async () => {
    setLoading(true);
    try {
        const res = await getSpecializations();
        setSpecializations(Array.isArray(res.data) ? res.data : []);
        setMessage({ type: "", text: "" });
    } catch (err) {
        console.error(err);
        setSpecializations([]);
        setMessage({ type: "error", text: "Failed to fetch specializations" });
    } finally {
        setLoading(false);
    }
    };


  useEffect(() => {
    fetchSpecs();
  }, []);

  // 🔥 CREATE / UPDATE
  const saveSpec = async () => {
    if (!name.trim()) {
        setMessage({ type: "error", text: "Enter name" });
        return;
    }

    try {
        if (editId) {
        await updateSpecialization(editId, { name });
        setMessage({ type: "success", text: "Updated" });
        } else {
        await createSpecialization({ name });
        setMessage({ type: "success", text: "Created" });
        }

        setName("");
        setEditId(null);
        setShowForm(false);
        fetchSpecs();
    } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Operation failed" });
    }
    };
  // 🔥 DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;

    try {
        await deleteSpecialization(id);
        setMessage({ type: "success", text: "Deleted" });
        fetchSpecs();
    } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Delete failed" });
    }
    };

  // 🔥 EDIT
  const handleEdit = (spec) => {
    setName(spec.name);
    setEditId(spec.id);
    setShowForm(true);
  };

  // 🔥 RESET FORM
  const handleCancel = () => {
    setName("");
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white text-lg">
                🧠
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Specializations
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage medical specializations and departments
                </p>
              </div>
            </div>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300 font-semibold"
              >
                <Plus size={20} />
                Add Specialization
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <Check size={20} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-8 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editId ? "Edit Specialization" : "Add New Specialization"}
              </h2>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors duration-300"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Specialization Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Neurology, Pediatrics..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && saveSpec()}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSpec}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300 font-semibold"
                >
                  <Check size={18} />
                  {editId ? "Update" : "Create"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors duration-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              {specializations.length > 0
                ? `Specializations (${specializations.length})`
                : "No Specializations"}
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              Loading specializations...
            </div>
          ) : specializations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-slate-400 text-4xl mb-3">📋</div>
              <p className="text-slate-500 mb-4">
                No specializations yet. Create your first one to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {specializations.map((spec) => (
                <div
                  key={spec.id}
                  className="group p-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg hover:shadow-md hover:border-slate-300 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-900 flex-1 break-words">
                      {spec.name}
                    </h3>
                    {/* <span className="text-xs font-mono text-slate-500 ml-2 flex-shrink-0">
                      #{spec.id}
                    </span> */}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(spec)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300 text-sm font-semibold"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(spec.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-300 text-sm font-semibold"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        div[role="alert"] {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Specializations;