"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { appointmentsAPI, prescriptionsAPI, patientsAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Phone, CheckCircle, History, Plus, Printer, X, FileText, Calendar, Stethoscope, TestTube, FileDown } from "lucide-react";

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
      
      // Restore current appointment from localStorage if exists
      const savedAppointment = localStorage.getItem('currentAppointment');
      const savedPatientHistory = localStorage.getItem('patientHistory');
      
      if (savedAppointment) {
        try {
          const appointment = JSON.parse(savedAppointment);
          // Verify appointment still exists and is not completed
          appointmentsAPI.getById(appointment.id)
            .then(async (currentAppt) => {
              if (currentAppt.status !== 'COMPLETED' && currentAppt.status !== 'CANCELLED') {
                setCurrentAppointment(currentAppt);
                // Update saved appointment with fresh data
                localStorage.setItem('currentAppointment', JSON.stringify(currentAppt));
                
                // Restore patient history if available, then reload fresh
                if (savedPatientHistory) {
                  try {
                    const history = JSON.parse(savedPatientHistory);
                    // Only restore if it's for the same patient
                    if (history.id === currentAppt.patientId) {
                      setPatientHistory(history);
                    }
                  } catch (error) {
                    // Ignore parse errors, will reload fresh
                  }
                }
                // Always reload fresh patient history in background
                await loadPatientHistory(currentAppt.patientId);
              } else {
                // Appointment was completed/cancelled, clear saved data
                localStorage.removeItem('currentAppointment');
                localStorage.removeItem('patientHistory');
              }
            })
            .catch(() => {
              // Appointment doesn't exist anymore, clear saved data
              localStorage.removeItem('currentAppointment');
              localStorage.removeItem('patientHistory');
            });
        } catch (error) {
          console.error("Error restoring appointment:", error);
          localStorage.removeItem('currentAppointment');
          localStorage.removeItem('patientHistory');
        }
      }
    }
  }, [user]);

  // Set up real-time updates via Socket.IO
  useEffect(() => {
    if (!user) return;

    let socket = null;
    let interval = null;
    let isCleanedUp = false;

    const setupSocket = async () => {
      try {
        const socketResult = await getSocket();
        if (!socketResult) {
          // Fallback to polling if socket not available
          if (!isCleanedUp) {
            interval = setInterval(loadWaitingPatients, 3000);
          }
          return;
        }

        socket = socketResult;

        // Set up socket listeners
        const setupSocketListeners = () => {
          if (isCleanedUp) return;
          
          // Listen for new patient added (from reception)
          socket.on("new-patient", (data) => {
            console.log("New patient added, refreshing waiting list...");
            loadWaitingPatients();
          });

          // Listen for queue updates
          socket.on("queue-update", () => {
            loadWaitingPatients();
          });

          // Listen for patient called
          socket.on("patient-called", () => {
            loadWaitingPatients();
          });

          // Listen for appointment completed
          socket.on("appointment-completed", () => {
            loadWaitingPatients();
          });

          // Listen for new lab report uploaded
          socket.on("lab-report-uploaded", (data) => {
            console.log("New lab report uploaded for patient:", data.patientId);
            // Refresh patient history if we're viewing that patient
            if (currentAppointment && currentAppointment.patientId === data.patientId) {
              console.log("Refreshing patient history for current appointment...");
              loadPatientHistory(currentAppointment.patientId);
            }
            // Also refresh if we have patient history loaded for this patient
            if (patientHistory && patientHistory.id === data.patientId) {
              console.log("Refreshing patient history...");
              loadPatientHistory(data.patientId);
            }
          });

          // Listen for prescription created (in case another doctor creates one)
          socket.on("prescription-created", (data) => {
            if (currentAppointment && currentAppointment.patientId === data.patientId) {
              loadPatientHistory(currentAppointment.patientId);
            }
          });
        };

        // Wait for socket connection
        if (socket.connected) {
          console.log("Socket already connected, setting up listeners");
          setupSocketListeners();
        } else {
          socket.on('connect', () => {
            if (!isCleanedUp) {
              console.log("Socket connected, setting up real-time listeners");
              setupSocketListeners();
            }
          });
          
          socket.on('disconnect', () => {
            console.log("Socket disconnected");
          });

          socket.on('error', (error) => {
            console.error("Socket error:", error);
          });
        }

      } catch (error) {
        console.error("Failed to setup socket:", error);
        // Fallback to polling
        if (!isCleanedUp) {
          interval = setInterval(loadWaitingPatients, 3000);
        }
      }
    };

    setupSocket();

    // Poll for updates every 3 seconds as fallback
    if (!interval) {
      interval = setInterval(loadWaitingPatients, 3000);
    }

    return () => {
      isCleanedUp = true;
      if (socket) {
        socket.off("new-patient");
        socket.off("queue-update");
        socket.off("patient-called");
        socket.off("appointment-completed");
        socket.off("lab-report-uploaded");
        socket.off("prescription-created");
        socket.off("connect");
        socket.off("disconnect");
        socket.off("error");
      }
      if (interval) {
        clearInterval(interval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentAppointment?.patientId, patientHistory?.id]);

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
      // Save to localStorage for persistence
      localStorage.setItem('currentAppointment', JSON.stringify(response.appointment));
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
      // Clear saved appointment from localStorage
      localStorage.removeItem('currentAppointment');
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
      // Update saved appointment in localStorage
      if (currentAppointment) {
        localStorage.setItem('currentAppointment', JSON.stringify(currentAppointment));
      }
      alert("Prescription created successfully!");
    } catch (error) {
      alert("Failed to create prescription: " + error.message);
    }
  };


  const printPrescription = (prescription) => {
    // Get patient name from prescription.patient or fallback to current patient history
    const patientName = prescription.patient?.name || patientHistory?.name || currentAppointment?.patient?.name || "Patient";
    
    // Parse medications safely
    let medications = [];
    try {
      if (typeof prescription.medications === 'string') {
        medications = JSON.parse(prescription.medications);
      } else if (Array.isArray(prescription.medications)) {
        medications = prescription.medications;
      }
    } catch (error) {
      console.error("Error parsing medications:", error);
      medications = [];
    }

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
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString()}</p>
          </div>
          ${prescription.diagnosis ? `<div class="section"><strong>Diagnosis:</strong> ${prescription.diagnosis}</div>` : ""}
          <div class="section">
            <strong>Medications:</strong>
            <div class="medications">
              ${medications.length > 0 ? medications.map((m) => `<div>• ${m}</div>`).join("") : "<div>No medications listed</div>"}
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
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg border-2 border-blue-200">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                    <Stethoscope size={28} />
                    Create New Prescription
                  </h3>
                  <button 
                    onClick={() => setShowPrescriptionForm(false)}
                    className="rounded-full bg-gray-200 p-2 hover:bg-gray-300 transition-colors"
                    title="Close"
                  >
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleCreatePrescription} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Diagnosis <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={prescriptionData.diagnosis}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                        className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter diagnosis..."
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Patient Name
                      </label>
                      <input
                        type="text"
                        value={currentAppointment?.patient?.name || ""}
                        disabled
                        className="w-full rounded-lg border-2 border-gray-200 bg-gray-100 px-4 py-2 text-gray-600"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Medications <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">(Enter one medication per line)</span>
                    </label>
                    <textarea
                      value={prescriptionData.medications}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, medications: e.target.value })}
                      rows={6}
                      required
                      className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors font-mono text-sm"
                      placeholder="Paracetamol 500mg - 1 tablet twice daily&#10;Amoxicillin 250mg - 1 capsule three times daily&#10;..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Example: Medicine Name - Dosage - Frequency
                    </p>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Instructions for Patient
                    </label>
                    <textarea
                      value={prescriptionData.instructions}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, instructions: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Take with food...&#10;Avoid alcohol...&#10;Complete the full course..."
                    />
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Additional Notes
                    </label>
                    <textarea
                      value={prescriptionData.notes}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Any additional notes or observations..."
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                    >
                      <Plus size={20} className="inline mr-2" />
                      Save Prescription
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionForm(false)}
                      className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}


            {/* Patient History */}
            {patientHistory && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h3 className="mb-6 text-2xl font-bold flex items-center gap-2 text-blue-600">
                  <History size={28} />
                  Complete Patient History
                </h3>

                {/* Patient Basic Info */}
                <div className="mb-6 rounded-lg bg-gray-50 p-4">
                  <h4 className="mb-3 text-lg font-semibold">Patient Information</h4>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-semibold">{patientHistory.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Age</p>
                      <p className="font-semibold">{patientHistory.age || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="font-semibold">{patientHistory.gender || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{patientHistory.phone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Past Appointments */}
                {patientHistory.appointments && patientHistory.appointments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-lg font-semibold flex items-center gap-2">
                      <Calendar size={20} />
                      Past Appointments ({patientHistory.appointments.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {patientHistory.appointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-lg border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg font-bold text-blue-600">Ticket #{appointment.ticketNumber}</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                  appointment.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                                  appointment.status === 'WAITING' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {appointment.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                <strong>Date:</strong> {new Date(appointment.createdAt).toLocaleString()}
                              </p>
                              {appointment.doctor && (
                                <p className="text-sm text-gray-600">
                                  <strong>Doctor:</strong> {appointment.doctor.name}
                                  {appointment.doctor.specialization && ` (${appointment.doctor.specialization})`}
                                </p>
                              )}
                              {appointment.completedAt && (
                                <p className="text-sm text-gray-600">
                                  <strong>Completed:</strong> {new Date(appointment.completedAt).toLocaleString()}
                                </p>
                              )}
                              {appointment.notes && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <strong>Notes:</strong> {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Prescriptions */}
                {patientHistory.prescriptions && patientHistory.prescriptions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-lg font-semibold flex items-center gap-2">
                      <Stethoscope size={20} />
                      Past Prescriptions ({patientHistory.prescriptions.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {patientHistory.prescriptions.map((prescription) => {
                        const medications = typeof prescription.medications === 'string' 
                          ? JSON.parse(prescription.medications) 
                          : prescription.medications;
                        return (
                          <div key={prescription.id} className="rounded-lg border-2 border-green-200 p-4 hover:border-green-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar size={16} className="text-gray-500" />
                                  <p className="font-semibold text-gray-700">
                                    {new Date(prescription.createdAt).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                {prescription.doctor && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>Prescribed by:</strong> Dr. {prescription.doctor.name}
                                    {prescription.doctor.specialization && ` (${prescription.doctor.specialization})`}
                                  </p>
                                )}
                                {prescription.diagnosis && (
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-gray-700">Diagnosis:</p>
                                    <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">{prescription.diagnosis}</p>
                                  </div>
                                )}
                                <div className="mb-2">
                                  <p className="text-sm font-semibold text-gray-700">Medications:</p>
                                  <ul className="list-disc list-inside text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                    {medications.map((med, idx) => (
                                      <li key={idx}>{med}</li>
                                    ))}
                                  </ul>
                                </div>
                                {prescription.instructions && (
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-gray-700">Instructions:</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{prescription.instructions}</p>
                                  </div>
                                )}
                                {prescription.notes && (
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-gray-700">Notes:</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{prescription.notes}</p>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => printPrescription(prescription)}
                                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 ml-4"
                                title="Print Prescription"
                              >
                                <Printer size={18} />
                                Print
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lab Reports */}
                {patientHistory.labReports && patientHistory.labReports.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-lg font-semibold flex items-center gap-2">
                      <TestTube size={20} />
                      Lab Reports ({patientHistory.labReports.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {patientHistory.labReports.map((report) => {
                        const fileUrl = report.fileUrl 
                          ? (report.fileUrl.startsWith('http') 
                              ? report.fileUrl 
                              : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${report.fileUrl.startsWith('/') ? report.fileUrl : '/' + report.fileUrl}`)
                          : null;
                        return (
                          <div key={report.id} className="rounded-lg border-2 border-purple-200 p-4 hover:border-purple-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <TestTube size={16} className="text-purple-600" />
                                  <p className="font-semibold text-lg">{report.testName}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                  <p className="text-sm text-gray-600">
                                    <strong>Date:</strong> {new Date(report.createdAt).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  {report.testType && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Test Type:</strong> {report.testType}
                                    </p>
                                  )}
                                </div>
                                {report.results && (
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-gray-700">Results:</p>
                                    <p className="text-sm text-gray-600 bg-purple-50 p-2 rounded whitespace-pre-wrap">{report.results}</p>
                                  </div>
                                )}
                                {report.notes && (
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-gray-700">Notes:</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{report.notes}</p>
                                  </div>
                                )}
                                {fileUrl && (
                                  <div className="mt-3">
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                                    >
                                      <FileDown size={18} />
                                      Download Report File
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Medical Records */}
                {patientHistory.medicalRecords && patientHistory.medicalRecords.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-lg font-semibold flex items-center gap-2">
                      <FileText size={20} />
                      Medical Records ({patientHistory.medicalRecords.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {patientHistory.medicalRecords.map((record) => {
                        const fileUrl = record.fileUrl 
                          ? (record.fileUrl.startsWith('http') 
                              ? record.fileUrl 
                              : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${record.fileUrl.startsWith('/') ? record.fileUrl : '/' + record.fileUrl}`)
                          : null;
                        return (
                          <div key={record.id} className="rounded-lg border-2 border-orange-200 p-4 hover:border-orange-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                                    {record.recordType}
                                  </span>
                                  <p className="font-semibold">{record.title}</p>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Date:</strong> {new Date(record.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{record.description}</p>
                                {fileUrl && (
                                  <div className="mt-2">
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-sm"
                                    >
                                      <FileText size={16} className="inline mr-1" />
                                      View Attachment
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!patientHistory.appointments || patientHistory.appointments.length === 0) &&
                 (!patientHistory.prescriptions || patientHistory.prescriptions.length === 0) &&
                 (!patientHistory.labReports || patientHistory.labReports.length === 0) &&
                 (!patientHistory.medicalRecords || patientHistory.medicalRecords.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <History size={48} className="mx-auto mb-2 text-gray-400" />
                    <p>No history available for this patient</p>
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
