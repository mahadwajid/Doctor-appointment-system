"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { patientsAPI, appointmentsAPI } from "@/lib/api";
import { Plus, Printer, Users, Clock, Search, CheckCircle, AlertCircle } from "lucide-react";

export default function ReceptionDashboard() {
  const { user, loading } = useAuth("RECEPTIONIST");
  const [patients, setPatients] = useState([]);
  const [waitingAppointments, setWaitingAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    gender: "",
    address: "",
  });
  const [loadingState, setLoadingState] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedExistingPatient, setSelectedExistingPatient] = useState(null);

  useEffect(() => {
    if (user) {
      loadWaitingAppointments();
    }
  }, [user]);

  const loadWaitingAppointments = async () => {
    try {
      const data = await appointmentsAPI.getWaiting();
      setWaitingAppointments(data);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    }
  };

  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await patientsAPI.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectExistingPatient = (patient) => {
    setSelectedExistingPatient(patient);
    setFormData({
      name: patient.name || "",
      phone: patient.phone || "",
      email: patient.email || "",
      age: patient.age || "",
      gender: patient.gender || "",
      address: patient.address || "",
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedExistingPatient(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      age: "",
      gender: "",
      address: "",
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setLoadingState(true);

    try {
      const response = await patientsAPI.create(formData);
      setShowForm(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        age: "",
        gender: "",
        address: "",
      });
      setSelectedExistingPatient(null);
      setSearchQuery("");
      setSearchResults([]);
      loadWaitingAppointments();
      
      const message = response.isNewPatient 
        ? `New patient registered! Ticket #${response.appointment.ticketNumber}`
        : `Appointment created for existing patient! Ticket #${response.appointment.ticketNumber}`;
      alert(message);
      
      // Print ticket (thermal printer simulation)
      printTicket(response.patient, response.appointment);
    } catch (error) {
      alert("Failed to add patient: " + error.message);
    } finally {
      setLoadingState(false);
    }
  };

  const printTicket = (patient, appointment) => {
    // Thermal printer simulation
    const printWindow = window.open("", "_blank");
    const printContent = `
      <html>
        <head>
          <title>Ticket Print</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 10px; font-family: monospace; }
            }
            body { font-family: monospace; padding: 20px; }
            .ticket { text-align: center; }
            .ticket-number { font-size: 48px; font-weight: bold; margin: 20px 0; }
            .patient-name { font-size: 24px; margin: 10px 0; }
            .info { font-size: 16px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h2>CLINIC TICKET</h2>
            <div class="ticket-number">#${appointment.ticketNumber}</div>
            <div class="patient-name">${patient.name}</div>
            <div class="info">Date: ${new Date().toLocaleDateString()}</div>
            <div class="info">Time: ${new Date().toLocaleTimeString()}</div>
            <div class="info">Please wait for your turn</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-blue-600">Reception Dashboard</h2>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center gap-3">
              <Clock className="text-orange-600" size={32} />
              <div>
                <p className="text-sm text-gray-600">Waiting Patients</p>
                <p className="text-2xl font-bold">{waitingAppointments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Patient Form */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Register New Patient</h3>
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  // Reset form when closing
                  setFormData({
                    name: "",
                    phone: "",
                    email: "",
                    age: "",
                    gender: "",
                    address: "",
                  });
                  setSelectedExistingPatient(null);
                  setSearchQuery("");
                  setSearchResults([]);
                }
              }}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus size={20} />
              {showForm ? "Cancel" : "Add Patient"}
            </button>
          </div>

          {showForm && (
            <div className="space-y-4">
              {/* Patient Search Section */}
              {!selectedExistingPatient && (
                <div className="rounded-lg bg-blue-50 p-4 border-2 border-blue-200">
                  <div className="mb-3">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      <Search className="inline mr-2" size={16} />
                      Search for Existing Patient (Optional)
                    </label>
                    <p className="text-xs text-gray-600 mb-2">
                      Search by phone or email to check if patient already exists. If found, we'll create an appointment for the existing patient.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearchPatient()}
                        placeholder="Enter phone number or email..."
                        className="flex-1 rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSearchPatient}
                        disabled={isSearching || !searchQuery.trim()}
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto rounded border bg-white">
                      <p className="p-2 text-xs font-semibold text-gray-600 bg-gray-50">Found {searchResults.length} patient(s):</p>
                      {searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => handleSelectExistingPatient(patient)}
                          className="cursor-pointer border-b p-3 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{patient.name}</p>
                              <p className="text-sm text-gray-600">
                                {patient.phone && `Phone: ${patient.phone}`}
                                {patient.phone && patient.email && " • "}
                                {patient.email && `Email: ${patient.email}`}
                              </p>
                              {patient.age && (
                                <p className="text-xs text-gray-500">Age: {patient.age} • Gender: {patient.gender || "N/A"}</p>
                              )}
                            </div>
                            <CheckCircle className="text-green-600" size={20} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="mt-3 rounded border bg-yellow-50 p-3 text-sm text-yellow-700">
                      <AlertCircle className="inline mr-2" size={16} />
                      No existing patient found. A new patient will be created.
                    </div>
                  )}
                </div>
              )}

              {/* Selected Existing Patient Info */}
              {selectedExistingPatient && (
                <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="text-green-600" size={20} />
                        <p className="font-semibold text-green-800">Existing Patient Selected</p>
                      </div>
                      <p className="text-sm text-gray-700">
                        <strong>Name:</strong> {selectedExistingPatient.name} | 
                        <strong> Ticket #:</strong> {selectedExistingPatient.ticketNumber}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        An appointment will be created for this existing patient. You can update the information below if needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="rounded bg-gray-300 px-3 py-1 text-sm hover:bg-gray-400"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingState}
                className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingState 
                  ? "Processing..." 
                  : selectedExistingPatient 
                    ? "Create Appointment for Existing Patient" 
                    : "Register Patient & Generate Ticket"}
              </button>
            </form>
            </div>
          )}
        </div>

        {/* Waiting Patients List */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h3 className="mb-4 text-xl font-semibold">Waiting Patients</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Ticket #</th>
                  <th className="px-4 py-2 text-left">Patient Name</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {waitingAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b">
                    <td className="px-4 py-2 font-bold text-blue-600">
                      #{appointment.ticketNumber}
                    </td>
                    <td className="px-4 py-2">{appointment.patient.name}</td>
                    <td className="px-4 py-2">{appointment.patient.phone || "-"}</td>
                    <td className="px-4 py-2">
                      {new Date(appointment.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {waitingAppointments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                      No waiting patients
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
