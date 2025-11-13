"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { patientsAPI, appointmentsAPI } from "@/lib/api";
import { Plus, Printer, Users, Clock } from "lucide-react";

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
      loadWaitingAppointments();
      alert(`Patient registered! Ticket #${response.appointment.ticketNumber}`);
      
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
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus size={20} />
              {showForm ? "Cancel" : "Add Patient"}
            </button>
          </div>

          {showForm && (
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
                {loadingState ? "Registering..." : "Register Patient & Generate Ticket"}
              </button>
            </form>
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
