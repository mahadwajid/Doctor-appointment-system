"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { appointmentsAPI, prescriptionsAPI, patientsAPI } from "@/lib/api";
import { Phone, CheckCircle, History, Plus, Printer, X } from "lucide-react";

export default function DoctorDashboard() {
  const { user, loading } = useAuth("DOCTOR");
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    medications: "",
    instructions: "",
    diagnosis: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      loadWaitingPatients();
    }
  }, [user]);

  const loadWaitingPatients = async () => {
    try {
      const data = await appointmentsAPI.getWaiting();
      setWaitingPatients(data);
    } catch (error) {
      console.error("Failed to load patients:", error);
    }
  };

  const handleCallNext = async () => {
    try {
      const response = await appointmentsAPI.callNext();
      setCurrentAppointment(response.appointment);
      await loadPatientHistory(response.appointment.patientId);
      loadWaitingPatients();
    } catch (error) {
      alert("Failed to call next patient: " + error.message);
    }
  };

  const loadPatientHistory = async (patientId) => {
    try {
      const patient = await patientsAPI.getById(patientId);
      setPatientHistory(patient);
    } catch (error) {
      console.error("Failed to load patient history:", error);
    }
  };

  const handleCompleteAppointment = async () => {
    if (!currentAppointment) return;

    try {
      await appointmentsAPI.complete(currentAppointment.id);
      setCurrentAppointment(null);
      setPatientHistory(null);
      setShowPrescriptionForm(false);
      loadWaitingPatients();
      alert("Appointment completed successfully!");
    } catch (error) {
      alert("Failed to complete appointment: " + error.message);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!currentAppointment) return;

    try {
      const medications = prescriptionData.medications
        .split("\n")
        .filter((m) => m.trim())
        .map((m) => m.trim());

      await prescriptionsAPI.create({
        appointmentId: currentAppointment.id,
        patientId: currentAppointment.patientId,
        medications: medications,
        instructions: prescriptionData.instructions,
        diagnosis: prescriptionData.diagnosis,
        notes: prescriptionData.notes,
      });

      setShowPrescriptionForm(false);
      setPrescriptionData({
        medications: "",
        instructions: "",
        diagnosis: "",
        notes: "",
      });
      await loadPatientHistory(currentAppointment.patientId);
      alert("Prescription created successfully!");
    } catch (error) {
      alert("Failed to create prescription: " + error.message);
    }
  };


  const printPrescription = (prescription) => {
    const printWindow = window.open("", "_blank");
    const printContent = `
      <html>
        <head>
          <title>Prescription</title>
          <style>
            @media print {
              @page { margin: 20mm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .patient-info { margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .medications { margin: 10px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRESCRIPTION</h1>
            <p>Dr. ${user?.name || "Doctor"}</p>
          </div>
          <div class="patient-info">
            <p><strong>Patient:</strong> ${prescription.patient.name}</p>
            <p><strong>Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString()}</p>
          </div>
          ${prescription.diagnosis ? `<div class="section"><strong>Diagnosis:</strong> ${prescription.diagnosis}</div>` : ""}
          <div class="section">
            <strong>Medications:</strong>
            <div class="medications">
              ${JSON.parse(prescription.medications).map((m) => `<div>• ${m}</div>`).join("")}
            </div>
          </div>
          ${prescription.instructions ? `<div class="section"><strong>Instructions:</strong> ${prescription.instructions}</div>` : ""}
          ${prescription.notes ? `<div class="section"><strong>Notes:</strong> ${prescription.notes}</div>` : ""}
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
        <h2 className="text-3xl font-bold text-blue-600">Doctor Dashboard</h2>

        {/* Patient Numbers Display - Prominent */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-blue-50 p-6 shadow-md border-2 border-blue-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Waiting Patients</p>
              <p className="text-5xl font-extrabold text-blue-600">{waitingPatients.length}</p>
            </div>
          </div>
          <div className="rounded-lg bg-green-50 p-6 shadow-md border-2 border-green-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Current Patient</p>
              <p className="text-5xl font-extrabold text-green-600">
                {currentAppointment ? `#${currentAppointment.ticketNumber}` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Waiting Patients List */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Waiting Patients Queue</h3>
            <button
              onClick={handleCallNext}
              disabled={waitingPatients.length === 0 || currentAppointment}
              className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Phone size={20} />
              Call Next Patient
            </button>
          </div>

          <div className="space-y-2">
            {waitingPatients.map((appointment, index) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between rounded border-2 p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-blue-600">#{appointment.ticketNumber}</span>
                      <span className="text-lg font-semibold">{appointment.patient.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(appointment.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {waitingPatients.length === 0 && (
              <p className="py-8 text-center text-gray-500">No waiting patients</p>
            )}
          </div>
        </div>

        {/* Current Appointment */}
        {currentAppointment && (
          <div className="space-y-6">
            <div className="rounded-lg bg-blue-50 p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  Current Patient: {currentAppointment.patient.name} (Ticket #{currentAppointment.ticketNumber})
                </h3>
                <button
                  onClick={handleCompleteAppointment}
                  className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  <CheckCircle size={20} />
                  Complete Appointment
                </button>
              </div>

              {/* Patient Info */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {currentAppointment.patient.name}
                </div>
                <div>
                  <strong>Phone:</strong> {currentAppointment.patient.phone || "-"}
                </div>
                <div>
                  <strong>Age:</strong> {currentAppointment.patient.age || "-"}
                </div>
                <div>
                  <strong>Gender:</strong> {currentAppointment.patient.gender || "-"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus size={16} className="inline mr-2" />
                  Add Prescription
                </button>
              </div>
            </div>

            {/* Prescription Form */}
            {showPrescriptionForm && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Create Prescription</h3>
                  <button onClick={() => setShowPrescriptionForm(false)}>
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleCreatePrescription} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Diagnosis</label>
                    <input
                      type="text"
                      value={prescriptionData.diagnosis}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Medications (one per line)</label>
                    <textarea
                      value={prescriptionData.medications}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, medications: e.target.value })}
                      rows={5}
                      required
                      className="w-full rounded border px-3 py-2"
                      placeholder="Medicine 1&#10;Medicine 2&#10;..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Instructions</label>
                    <textarea
                      value={prescriptionData.instructions}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, instructions: e.target.value })}
                      rows={3}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Notes</label>
                    <textarea
                      value={prescriptionData.notes}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Save Prescription
                  </button>
                </form>
              </div>
            )}


            {/* Patient History */}
            {patientHistory && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-4 text-xl font-semibold flex items-center gap-2">
                  <History size={24} />
                  Patient History
                </h3>

                {/* Past Prescriptions */}
                {patientHistory.prescriptions && patientHistory.prescriptions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 font-semibold">Past Prescriptions</h4>
                    <div className="space-y-2">
                      {patientHistory.prescriptions.map((prescription) => (
                        <div key={prescription.id} className="rounded border p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">
                                {new Date(prescription.createdAt).toLocaleDateString()}
                              </p>
                              {prescription.diagnosis && (
                                <p className="text-sm text-gray-600">Diagnosis: {prescription.diagnosis}</p>
                              )}
                            </div>
                            <button
                              onClick={() => printPrescription(prescription)}
                              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                            >
                              <Printer size={16} />
                              Print
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lab Reports */}
                {patientHistory.labReports && patientHistory.labReports.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-2 font-semibold">Lab Reports</h4>
                    <div className="space-y-2">
                      {patientHistory.labReports.map((report) => (
                        <div key={report.id} className="rounded border p-3">
                          <p className="font-semibold">{report.testName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                          {report.fileUrl && (
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Report
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
