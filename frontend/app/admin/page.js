"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { adminAPI } from "@/lib/api";
import { Plus, Trash2, Users, Stethoscope, ClipboardList, Activity, FileText, Clock, UserPlus, Edit2, Search, X } from "lucide-react";
import { patientsAPI } from "@/lib/api";

export default function AdminDashboard() {
  const { user, loading } = useAuth("SUPER_ADMIN");
  const [doctors, setDoctors] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [labStaff, setLabStaff] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPatient, setEditingPatient] = useState(null);
  const [patientFormData, setPatientFormData] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    gender: "",
    address: "",
  });
  
  // Forms state
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showReceptionistForm, setShowReceptionistForm] = useState(false);
  const [showLabStaffForm, setShowLabStaffForm] = useState(false);
  
  const [doctorFormData, setDoctorFormData] = useState({
    email: "",
    password: "",
    name: "",
    specialization: "",
    licenseNumber: "",
    phone: "",
  });
  
  const [receptionistFormData, setReceptionistFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  
  const [labStaffFormData, setLabStaffFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    await Promise.all([
      loadDoctors(),
      loadReceptionists(),
      loadLabStaff(),
      loadStats(),
      loadLogs(),
      loadPatients(),
    ]);
  };

  const loadPatients = async () => {
    try {
      const data = await patientsAPI.getAll();
      setPatients(data);
    } catch (error) {
      console.error("Failed to load patients:", error);
    }
  };

  const loadDoctors = async () => {
    try {
      const data = await adminAPI.getDoctors();
      setDoctors(data);
    } catch (error) {
      console.error("Failed to load doctors:", error);
    }
  };

  const loadReceptionists = async () => {
    try {
      const users = await adminAPI.getUsers();
      setReceptionists(users.filter(u => u.role === 'RECEPTIONIST'));
    } catch (error) {
      console.error("Failed to load receptionists:", error);
    }
  };

  const loadLabStaff = async () => {
    try {
      const users = await adminAPI.getUsers();
      setLabStaff(users.filter(u => u.role === 'LAB_STAFF'));
    } catch (error) {
      console.error("Failed to load lab staff:", error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await adminAPI.getLogs(100);
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setLoadingState(true);
    try {
      await adminAPI.createDoctor(doctorFormData);
      setShowDoctorForm(false);
      setDoctorFormData({ email: "", password: "", name: "", specialization: "", licenseNumber: "", phone: "" });
      await loadData();
      alert("Doctor created successfully!");
    } catch (error) {
      alert("Failed to create doctor: " + error.message);
    } finally {
      setLoadingState(false);
    }
  };

  const handleCreateReceptionist = async (e) => {
    e.preventDefault();
    setLoadingState(true);
    try {
      await adminAPI.createReceptionist(receptionistFormData);
      setShowReceptionistForm(false);
      setReceptionistFormData({ email: "", password: "", name: "" });
      await loadData();
      alert("Receptionist created successfully!");
    } catch (error) {
      alert("Failed to create receptionist: " + error.message);
    } finally {
      setLoadingState(false);
    }
  };

  const handleCreateLabStaff = async (e) => {
    e.preventDefault();
    setLoadingState(true);
    try {
      await adminAPI.createLabStaff(labStaffFormData);
      setShowLabStaffForm(false);
      setLabStaffFormData({ email: "", password: "", name: "" });
      await loadData();
      alert("Lab staff created successfully!");
    } catch (error) {
      alert("Failed to create lab staff: " + error.message);
    } finally {
      setLoadingState(false);
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!confirm("Are you sure you want to delete this doctor?")) return;
    try {
      await adminAPI.deleteDoctor(id);
      loadDoctors();
      alert("Doctor deleted successfully!");
    } catch (error) {
      alert("Failed to delete doctor: " + error.message);
    }
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!editingPatient) return;
    
    setLoadingState(true);
    try {
      await patientsAPI.update(editingPatient.id, patientFormData);
      setEditingPatient(null);
      setPatientFormData({ name: "", phone: "", email: "", age: "", gender: "", address: "" });
      await loadPatients();
      alert("Patient updated successfully!");
    } catch (error) {
      alert("Failed to update patient: " + error.message);
    } finally {
      setLoadingState(false);
    }
  };

  const handleDeletePatient = async (id) => {
    if (!confirm("Are you sure you want to delete this patient? This will also delete all related appointments, prescriptions, and lab reports. This action cannot be undone.")) return;
    try {
      // Use admin endpoint which bypasses active appointment check
      await adminAPI.deletePatient(id);
      await loadPatients();
      alert("Patient deleted successfully!");
    } catch (error) {
      alert("Failed to delete patient: " + error.message);
    }
  };

  const handleDeleteUser = async (id, userName, userRole) => {
    if (!confirm(`Are you sure you want to delete ${userName} (${userRole})? This action cannot be undone and will delete all related data.`)) return;
    try {
      await adminAPI.deleteUser(id);
      await loadData();
      alert("User deleted successfully!");
    } catch (error) {
      alert("Failed to delete user: " + error.message);
    }
  };

  const handleEditClick = (patient) => {
    setEditingPatient(patient);
    setPatientFormData({
      name: patient.name || "",
      phone: patient.phone || "",
      email: patient.email || "",
      age: patient.age || "",
      gender: patient.gender || "",
      address: patient.address || "",
    });
  };

  const filteredPatients = patients.filter(patient => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(query) ||
      patient.phone?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.ticketNumber?.toString().includes(query)
    );
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'APPOINTMENT': return <Clock className="text-blue-600" size={16} />;
      case 'PRESCRIPTION': return <FileText className="text-green-600" size={16} />;
      case 'LAB_REPORT': return <Activity className="text-purple-600" size={16} />;
      case 'USER': return <UserPlus className="text-orange-600" size={16} />;
      default: return <FileText size={16} />;
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-blue-600">Super Admin Dashboard</h2>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "overview" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "users" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
            }`}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "patients" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
            }`}
          >
            Patients
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "logs" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
            }`}
          >
            System Logs
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="flex items-center gap-3">
                    <Users className="text-blue-600" size={32} />
                    <div>
                      <p className="text-sm text-gray-600">Total Patients</p>
                      <p className="text-2xl font-bold">{stats.totalPatients}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="text-green-600" size={32} />
                    <div>
                      <p className="text-sm text-gray-600">Active Doctors</p>
                      <p className="text-2xl font-bold">{stats.totalDoctors}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="text-purple-600" size={32} />
                    <div>
                      <p className="text-sm text-gray-600">Today's Appointments</p>
                      <p className="text-2xl font-bold">{stats.todayAppointments}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="flex items-center gap-3">
                    <Activity className="text-orange-600" size={32} />
                    <div>
                      <p className="text-sm text-gray-600">Waiting</p>
                      <p className="text-2xl font-bold">{stats.waitingAppointments}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Users Management Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Create User Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDoctorForm(!showDoctorForm);
                  setShowReceptionistForm(false);
                  setShowLabStaffForm(false);
                }}
                className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <Plus size={20} />
                Add Doctor
              </button>
              <button
                onClick={() => {
                  setShowReceptionistForm(!showReceptionistForm);
                  setShowDoctorForm(false);
                  setShowLabStaffForm(false);
                }}
                className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                <Plus size={20} />
                Add Receptionist
              </button>
              <button
                onClick={() => {
                  setShowLabStaffForm(!showLabStaffForm);
                  setShowDoctorForm(false);
                  setShowReceptionistForm(false);
                }}
                className="flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                <Plus size={20} />
                Add Lab Staff
              </button>
            </div>

            {/* Doctor Form */}
            {showDoctorForm && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold">Create Doctor</h3>
                <form onSubmit={handleCreateDoctor} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name *</label>
                      <input
                        type="text"
                        value={doctorFormData.name}
                        onChange={(e) => setDoctorFormData({ ...doctorFormData, name: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email *</label>
                      <input
                        type="email"
                        value={doctorFormData.email}
                        onChange={(e) => setDoctorFormData({ ...doctorFormData, email: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Password *</label>
                      <input
                        type="password"
                        value={doctorFormData.password}
                        onChange={(e) => setDoctorFormData({ ...doctorFormData, password: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Specialization</label>
                      <input
                        type="text"
                        value={doctorFormData.specialization}
                        onChange={(e) => setDoctorFormData({ ...doctorFormData, specialization: e.target.value })}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">License Number</label>
                      <input
                        type="text"
                        value={doctorFormData.licenseNumber}
                        onChange={(e) => setDoctorFormData({ ...doctorFormData, licenseNumber: e.target.value })}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Phone</label>
                      <input
                        type="tel"
                        value={doctorFormData.phone}
                        onChange={(e) => setDoctorFormData({ ...doctorFormData, phone: e.target.value })}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loadingState}
                      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loadingState ? "Creating..." : "Create Doctor"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDoctorForm(false)}
                      className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Receptionist Form */}
            {showReceptionistForm && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold">Create Receptionist</h3>
                <form onSubmit={handleCreateReceptionist} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name *</label>
                      <input
                        type="text"
                        value={receptionistFormData.name}
                        onChange={(e) => setReceptionistFormData({ ...receptionistFormData, name: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email *</label>
                      <input
                        type="email"
                        value={receptionistFormData.email}
                        onChange={(e) => setReceptionistFormData({ ...receptionistFormData, email: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Password *</label>
                      <input
                        type="password"
                        value={receptionistFormData.password}
                        onChange={(e) => setReceptionistFormData({ ...receptionistFormData, password: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loadingState}
                      className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {loadingState ? "Creating..." : "Create Receptionist"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReceptionistForm(false)}
                      className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lab Staff Form */}
            {showLabStaffForm && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold">Create Lab Staff</h3>
                <form onSubmit={handleCreateLabStaff} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name *</label>
                      <input
                        type="text"
                        value={labStaffFormData.name}
                        onChange={(e) => setLabStaffFormData({ ...labStaffFormData, name: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email *</label>
                      <input
                        type="email"
                        value={labStaffFormData.email}
                        onChange={(e) => setLabStaffFormData({ ...labStaffFormData, email: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Password *</label>
                      <input
                        type="password"
                        value={labStaffFormData.password}
                        onChange={(e) => setLabStaffFormData({ ...labStaffFormData, password: e.target.value })}
                        required
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loadingState}
                      className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loadingState ? "Creating..." : "Create Lab Staff"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLabStaffForm(false)}
                      className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users Lists */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Doctors */}
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold">Doctors ({doctors.length})</h3>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {doctors.map((doctor) => (
                    <div key={doctor.id} className="flex items-center justify-between rounded border p-2">
                      <div>
                        <p className="font-semibold">{doctor.name}</p>
                        <p className="text-sm text-gray-600">{doctor.specialization || "No specialization"}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receptionists */}
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold">Receptionists ({receptionists.length})</h3>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {receptionists.map((receptionist) => (
                    <div key={receptionist.id} className="flex items-center justify-between rounded border p-2">
                      <div>
                        <p className="font-semibold">{receptionist.name}</p>
                        <p className="text-sm text-gray-600">{receptionist.email}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(receptionist.id, receptionist.name, 'Receptionist')}
                        className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                        title="Delete Receptionist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Staff */}
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold">Lab Staff ({labStaff.length})</h3>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {labStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between rounded border p-2">
                      <div>
                        <p className="font-semibold">{staff.name}</p>
                        <p className="text-sm text-gray-600">{staff.email}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(staff.id, staff.name, 'Lab Staff')}
                        className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                        title="Delete Lab Staff"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patients Management Tab */}
        {activeTab === "patients" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-blue-600">Patient Management</h3>
              <button
                onClick={loadPatients}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>

            {/* Search Bar */}
            <div className="rounded-lg bg-white p-4 shadow-md">
              <div className="flex items-center gap-2">
                <Search className="text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, email, or ticket number..."
                  className="flex-1 rounded border px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Patients Table */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold">
                  All Patients ({filteredPatients.length})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Ticket #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Age</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Registered</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-blue-600">
                          #{patient.ticketNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold">{patient.name}</td>
                        <td className="px-4 py-3">{patient.phone || "-"}</td>
                        <td className="px-4 py-3">{patient.email || "-"}</td>
                        <td className="px-4 py-3">{patient.age || "-"}</td>
                        <td className="px-4 py-3">{patient.gender || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(patient)}
                              className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                              title="Edit Patient"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePatient(patient.id)}
                              className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                              title="Delete Patient"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPatients.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          {searchQuery ? "No patients found matching your search" : "No patients registered yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit Patient Modal */}
            {editingPatient && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-blue-600">Edit Patient</h3>
                    <button
                      onClick={() => {
                        setEditingPatient(null);
                        setPatientFormData({ name: "", phone: "", email: "", age: "", gender: "", address: "" });
                      }}
                      className="rounded-full bg-gray-200 p-2 hover:bg-gray-300"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <form onSubmit={handleUpdatePatient} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Name *</label>
                        <input
                          type="text"
                          value={patientFormData.name}
                          onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                          required
                          className="w-full rounded border px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Phone</label>
                        <input
                          type="tel"
                          value={patientFormData.phone}
                          onChange={(e) => setPatientFormData({ ...patientFormData, phone: e.target.value })}
                          className="w-full rounded border px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Email</label>
                        <input
                          type="email"
                          value={patientFormData.email}
                          onChange={(e) => setPatientFormData({ ...patientFormData, email: e.target.value })}
                          className="w-full rounded border px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Age</label>
                        <input
                          type="number"
                          value={patientFormData.age}
                          onChange={(e) => setPatientFormData({ ...patientFormData, age: e.target.value })}
                          className="w-full rounded border px-3 py-2"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Gender</label>
                        <select
                          value={patientFormData.gender}
                          onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value })}
                          className="w-full rounded border px-3 py-2"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Ticket Number</label>
                        <input
                          type="text"
                          value={editingPatient.ticketNumber}
                          disabled
                          className="w-full rounded border bg-gray-100 px-3 py-2 text-gray-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Address</label>
                      <textarea
                        value={patientFormData.address}
                        onChange={(e) => setPatientFormData({ ...patientFormData, address: e.target.value })}
                        rows={3}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button
                        type="submit"
                        disabled={loadingState}
                        className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loadingState ? "Updating..." : "Update Patient"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPatient(null);
                          setPatientFormData({ name: "", phone: "", email: "", age: "", gender: "", address: "" });
                        }}
                        className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Logs Tab */}
        {activeTab === "logs" && (
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">System Activity Logs</h3>
              <button
                onClick={loadLogs}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={`${log.id}-${index}`} className="flex items-start gap-3 rounded border p-3">
                  <div className="mt-1">{getLogIcon(log.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{log.type}</span>
                      <span className="text-sm font-semibold">{log.action}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{log.details}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="py-8 text-center text-gray-500">No logs available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
