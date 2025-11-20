"use client";

import { useState, useEffect } from "react";
import Layout from "@/Components/Layout";
import { useAuth } from "@/middleware/auth";
import { appointmentsAPI, prescriptionsAPI, patientsAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Phone, CheckCircle, History, Plus, Printer, X, FileText, Calendar, Stethoscope, TestTube, FileDown, Users } from "lucide-react";

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
    
    // Get doctor information
    const doctor = user?.doctor || prescription.doctor;
    const doctorName = doctor?.name || user?.name || "Dr. M. Shahid Ghani";
    const doctorSpecialization = doctor?.specialization || "M.B.B.S, M.C.P.S. (Pak), F.A.C.P";
    const doctorLicense = doctor?.licenseNumber || "9703-N";
    const doctorPhone = doctor?.phone || "0315-1600006";
    const clinicName = "NISAR MEDICAL CENTER";
    const clinicAddress = "Bahadur Khan Road, Opp. TMA, Shamsi Road, Mardan";
    const clinicPhones = doctorPhone + " | 0937-866877";
    
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

    // Format date
    const prescriptionDate = new Date(prescription.createdAt);
    const formattedDate = prescriptionDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, ' / ');

    // Format medications for prescription lines - handle long lists efficiently
    let medicationsHTML = '';
    if (medications.length > 0) {
      medicationsHTML = medications.map((m, idx) => {
        // Handle long medication names by allowing word wrap, compact spacing for long lists
        const spacing = medications.length > 20 ? '4px' : '6px';
        return `<div style="padding-left: 20px; margin-bottom: ${spacing}; font-size: 13px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${idx + 1}. ${m}</div>`;
      }).join('');
    } else {
      medicationsHTML = '<div style="padding-left: 20px; color: #94a3b8; font-style: italic;">No medications prescribed</div>';
    }

    // Build prescription content with better handling for long content
    let prescriptionContent = '';
    if (prescription.diagnosis) {
      prescriptionContent += `<div style="margin-bottom: 10px; word-wrap: break-word; line-height: 1.5;"><strong style="color: var(--primary-color);">Diagnosis:</strong> ${prescription.diagnosis}</div>`;
    }
    prescriptionContent += `<div style="margin-bottom: 8px;"><strong style="color: var(--primary-color);">Medications:</strong></div>${medicationsHTML}`;
    if (prescription.instructions) {
      // Handle long instructions with word wrap and line breaks
      const instructionsLines = prescription.instructions.split('\n').map(line => line.trim()).filter(line => line);
      const instructionsHTML = instructionsLines.length > 0 
        ? instructionsLines.map(line => `<div style="margin-bottom: 3px; word-wrap: break-word; line-height: 1.4; white-space: pre-wrap;">${line}</div>`).join('')
        : `<div style="word-wrap: break-word; line-height: 1.4; white-space: pre-wrap;">${prescription.instructions}</div>`;
      prescriptionContent += `<div style="margin-top: 12px; margin-bottom: 10px;"><strong style="color: var(--primary-color);">Instructions:</strong><div style="padding-left: 20px; margin-top: 4px;">${instructionsHTML}</div></div>`;
    }
    if (prescription.notes) {
      // Handle long notes with word wrap and line breaks
      const notesLines = prescription.notes.split('\n').map(line => line.trim()).filter(line => line);
      const notesHTML = notesLines.length > 0 
        ? notesLines.map(line => `<div style="margin-bottom: 3px; word-wrap: break-word; line-height: 1.4; white-space: pre-wrap;">${line}</div>`).join('')
        : `<div style="word-wrap: break-word; line-height: 1.4; white-space: pre-wrap;">${prescription.notes}</div>`;
      prescriptionContent += `<div style="margin-top: 12px;"><strong style="color: var(--primary-color);">Notes:</strong><div style="padding-left: 20px; margin-top: 4px;">${notesHTML}</div></div>`;
    }

    const printWindow = window.open("", "_blank");
    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Modern Prescription - ${doctorName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Open+Sans:wght@400;600&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
              :root {
                  --primary-color: #0e7490; /* Teal Blue */
                  --secondary-color: #155e75; /* Darker Teal */
                  --accent-red: #dc2626; /* Medical Red */
                  --light-bg: #f0f9ff; /* Very light blue bg */
                  --text-dark: #1e293b;
                  --text-light: #64748b;
                  --border-color: #cbd5e1;
              }
              * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
              }
              body {
                  background-color: #e2e8f0;
                  font-family: 'Poppins', sans-serif;
                  display: flex;
                  justify-content: center;
                  padding: 40px 20px;
                  color: var(--text-dark);
              }
              /* A4 Sheet */
              .page-container {
                  background-color: white;
                  width: 210mm;
                  min-height: 297mm;
                  position: relative;
                  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                  display: flex;
                  flex-direction: column;
                  overflow: visible;
                  margin: 0 auto;
              }
              /* --- HEADER --- */
              header {
                  padding: 30px 25px 18px 25px;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  border-bottom: 2px solid var(--primary-color);
                  background: linear-gradient(to bottom, #ffffff, #f8fafc);
                  flex-shrink: 0;
              }
              .urdu-header-section {
                  text-align: right;
                  padding-left: 10px;
                  padding-right: 20px;
                  margin-right: 20px;
              }
              .urdu-header-section .urdu-doc-name {
                  font-family: 'Noto Nastaliq Urdu', serif;
                  font-size: 22px;
                  font-weight: 700;
                  margin-bottom: 8px;
                  color: var(--secondary-color);
              }
              .urdu-header-section .urdu-details {
                  font-family: 'Noto Nastaliq Urdu', serif;
                  font-size: 13px;
                  color: var(--text-light);
                  line-height: 1.8;
                  direction: rtl;
              }
              .doc-profile {
                  display: flex;
                  gap: 20px;
                  align-items: center;
              }
              .logo-box {
                  width: 80px;
                  height: 80px;
                  background-color: var(--primary-color) !important;
                  color: white !important;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 32px;
                  box-shadow: 0 4px 10px rgba(14, 116, 144, 0.3);
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  color-adjust: exact;
              }
              .doc-info h1 {
                  color: var(--secondary-color);
                  font-size: 26px;
                  font-weight: 700;
                  line-height: 1.2;
              }
              .doc-info p {
                  font-family: 'Open Sans', sans-serif;
                  font-size: 12px;
                  color: var(--text-light);
                  margin-top: 4px;
              }
              .highlight-degrees {
                  color: var(--primary-color);
                  font-weight: 600;
                  font-size: 13px;
                  margin-bottom: 4px;
                  display: block;
              }
              /* --- PATIENT INFO BAR --- */
              .patient-section {
                  background-color: var(--light-bg);
                  padding: 12px 25px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid var(--border-color);
                  flex-shrink: 0;
              }
              .input-group {
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }
              .label {
                  font-weight: 600;
                  font-size: 14px;
                  color: var(--secondary-color);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }
              .input-line {
                  border-bottom: 1px dashed var(--text-light);
                  width: 250px;
                  color: var(--text-dark);
                  font-family: 'Open Sans', sans-serif;
                  font-size: 16px;
                  padding-left: 5px;
                  min-width: 200px;
              }
              .date-box {
                  background: white;
                  padding: 5px 15px;
                  border-radius: 20px;
                  border: 1px solid var(--border-color);
                  font-size: 14px;
                  font-weight: 600;
                  color: var(--primary-color);
              }
              /* --- MAIN BODY --- */
              .main-body {
                  display: flex;
                  flex: 1;
                  min-height: 0;
                  position: relative;
                  overflow: visible;
              }
              /* Watermark Background */
              .watermark {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  opacity: 0.03;
                  pointer-events: none;
                  font-size: 400px;
                  color: var(--primary-color);
                  z-index: 0;
              }
              /* Left Sidebar (Vitals) */
              .sidebar {
                  width: 20%;
                  background-color: #fafafa;
                  border-right: 1px solid var(--border-color);
                  padding: 25px 15px;
                  display: flex;
                  flex-direction: column;
                  gap: 25px;
                  z-index: 1;
                  flex-shrink: 0;
              }
              .sidebar-title {
                  font-family: 'Poppins', sans-serif;
                  font-size: 12px;
                  color: var(--accent-red);
                  font-weight: 700;
                  text-transform: uppercase;
                  margin-bottom: 10px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
              }
              .vital-box {
                  margin-bottom: 15px;
              }
              .vital-label {
                  font-size: 12px;
                  color: var(--text-light);
                  display: block;
                  margin-bottom: 5px;
              }
              .vital-input {
                  width: 100%;
                  border: 1px solid #e2e8f0;
                  background: white;
                  height: 35px;
                  border-radius: 6px;
              }
              /* Prescription Area */
              .rx-area {
                  width: 80%;
                  padding: 30px 25px;
                  position: relative;
                  z-index: 1;
                  overflow: visible;
              }
              .rx-header {
                  font-size: 48px;
                  font-weight: 700;
                  color: var(--accent-red);
                  font-family: serif;
                  margin-bottom: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
              }
              .rx-lines {
                  width: 100%;
                  min-height: 400px;
                  padding: 10px 0;
                  font-family: 'Open Sans', sans-serif;
                  font-size: 13px;
                  line-height: 36px;
                  overflow: visible;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              /* --- FOOTER --- */
              footer {
                  background-color: var(--secondary-color);
                  color: white;
                  padding: 15px 20px;
                  margin-top: auto;
                  display: grid;
                  grid-template-columns: 1fr 1fr; 
                  gap: 12px;
                  align-items: center;
                  border-top: 5px solid var(--accent-red);
                  flex-shrink: 0;
              }
              /* Column 1: Address */
              .footer-col-1 {
                  text-align: left;
              }
              .clinic-title-en {
                  font-weight: 700;
                  font-size: 18px;
                  margin-bottom: 5px;
                  color: #bef264; /* Lime accent for contrast */
              }
              .clinic-address {
                  font-size: 11px;
                  opacity: 0.9;
                  line-height: 1.4;
              }
              .clinic-phones {
                  margin-top: 8px;
                  font-size: 12px;
                  font-weight: 600;
              }
              /* Column 2: Timing & QR */
              .footer-col-3 {
                  text-align: right;
                  display: flex;
                  flex-direction: column;
                  align-items: flex-end;
                  gap: 10px;
                  padding: 0 10px 0 20px;
                  margin-left: auto;
              }
              .timing-badge {
                  background: rgba(255,255,255,0.1);
                  padding: 5px 10px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-family: 'Noto Nastaliq Urdu', serif;
                  text-align: right;
                  direction: rtl;
              }
              .qr-box {
                  background: white;
                  padding: 4px;
                  border-radius: 4px;
                  width: 60px;
                  height: 60px;
              }
              .qr-box img {
                  width: 100%;
                  height: 100%;
              }
              /* Print Optimizations */
              @media print {
                  @page {
                      size: A4;
                      margin: 0;
                  }
                  * {
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                  }
                  body {
                      background: white;
                      padding: 0;
                      margin: 0;
                      display: flex;
                      justify-content: center;
                  }
                  .page-container {
                      box-shadow: none;
                      width: 210mm;
                      min-height: 297mm;
                      margin: 0 auto;
                      padding: 0;
                      display: flex;
                      flex-direction: column;
                      page-break-inside: avoid;
                      overflow: visible;
                  }
                  /* Allow content to flow to next page if needed */
                  .rx-lines > div {
                      page-break-inside: avoid;
                  }
                  /* If content is very long, allow it to continue on next page */
                  @page {
                      size: A4;
                      margin: 0;
                  }
                  header {
                      padding: 25px 20px 15px 20px;
                      page-break-inside: avoid;
                      page-break-after: avoid;
                  }
                  .urdu-header-section {
                      padding-right: 15px;
                      margin-right: 15px;
                  }
                  .patient-section {
                      padding: 12px 20px;
                      page-break-inside: avoid;
                      page-break-after: avoid;
                  }
                  .main-body {
                      flex: 1;
                      min-height: 0;
                      page-break-inside: avoid;
                      overflow: visible;
                  }
                  .rx-lines {
                      min-height: auto;
                      max-height: none;
                      overflow: visible;
                      page-break-inside: auto;
                      /* Allow content to flow naturally */
                  }
                  .rx-area {
                      overflow: visible;
                      page-break-inside: auto;
                  }
                  /* Prevent breaking individual medication items */
                  .rx-lines > div {
                      page-break-inside: avoid;
                      orphans: 2;
                      widows: 2;
                  }
                  footer {
                      margin-top: auto;
                      padding: 15px 18px;
                      page-break-inside: avoid;
                      page-break-before: avoid;
                  }
                  .rx-area {
                      padding: 30px 20px;
                  }
                  .sidebar {
                      padding: 25px 12px;
                  }
                  .input-line, .vital-input {
                      border: none;
                      border-bottom: 1px solid #ccc;
                  }
                  .logo-box {
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                      background-color: var(--primary-color) !important;
                  }
              }
          </style>
      </head>
      <body>
          <div class="page-container">
              <header>
                  <div class="doc-profile">
                      <div class="logo-box">
                          <i class="fa-solid fa-user-doctor"></i>
                      </div>
                      <div class="doc-info">
                          <h1>${doctorName}</h1>
                          <span class="highlight-degrees">${doctorSpecialization}</span>
                          <p>Fellowship in Internal Medicine (Pak)</p>
                          <p>Medical Specialist & Family Physician</p>
                          <p style="font-weight: bold; color: var(--primary-color); margin-top: 5px;">PMDC: ${doctorLicense}</p>
                      </div>
                  </div>
                  <div class="urdu-header-section">
                      <div class="urdu-doc-name">${doctorName.includes('Shahid') ? 'ڈاکٹر شاہد غنی' : 'ڈاکٹر'}</div>
                      <div class="urdu-details">
                          میڈیکل سپیشلسٹ اینڈ فیملی فزیشن<br>
                          ماہر امراض: معدہ، جگر، گردہ، شوگر، بلڈ پریشر، دل
                      </div>
                  </div>
              </header>
              <div class="patient-section">
                  <div class="input-group">
                      <span class="label"><i class="fa-regular fa-user"></i> Patient:</span>
                      <div class="input-line">${patientName}</div>
                  </div>
                  <div class="input-group">
                      <span class="label"><i class="fa-solid fa-calendar-days"></i> Date:</span>
                      <div class="date-box">${formattedDate}</div>
                  </div>
              </div>
              <div class="main-body">
                  <i class="fa-solid fa-staff-snake watermark"></i>
                  <aside class="sidebar">
                      <div>
                          <div class="sidebar-title"><i class="fa-solid fa-clipboard-list"></i> Clinical Records</div>
                      </div> 
                  </aside>
                  <main class="rx-area">
                      <div class="rx-header">
                          <span><i class="fa-solid fa-prescription"></i></span>
                          <span style="font-size: 12px; color: #94a3b8; font-family: sans-serif; font-weight: normal;">Not Valid for Court Evidence</span>
                      </div>
                      <div class="rx-lines">
                          ${prescriptionContent}
                      </div>
                  </main>
              </div>
              <footer>
                  <div class="footer-col-1">
                      <div class="clinic-title-en">${clinicName}</div>
                      <div class="clinic-address">
                          <i class="fa-solid fa-location-dot"></i> ${clinicAddress}
                      </div>
                      <div class="clinic-phones">
                          <i class="fa-solid fa-phone"></i> ${clinicPhones}
                      </div>
                  </div>
                  <div class="footer-col-3">
                      <div class="timing-badge">
                          اوقات: صبح 9 تا 1 بجے | عصر تا مغرب<br>
                          <span style="font-size:10px; color:#fca5a5;">(چھٹی بروز اتوار) Sunday Closed</span>
                      </div>
                  </div>
              </footer>
          </div>
      </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    // Small delay to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-display font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Doctor Dashboard
            </h2>
            <p className="mt-1 text-gray-600">Manage appointments and patient care</p>
          </div>
        </div>

        {/* Patient Numbers Display - Prominent */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="stat-card group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Waiting Patients</p>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Phone size={24} className="text-white" />
                </div>
              </div>
              <p className="text-6xl font-display font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                {waitingPatients.length}
              </p>
              <p className="mt-2 text-sm text-gray-500">In queue</p>
            </div>
          </div>
          <div className="stat-card group" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Current Patient</p>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center shadow-lg shadow-success-500/20">
                  <CheckCircle size={24} className="text-white" />
                </div>
              </div>
              <p className="text-6xl font-display font-bold bg-gradient-to-r from-success-600 to-success-800 bg-clip-text text-transparent">
                {currentAppointment ? `#${currentAppointment.ticketNumber}` : "-"}
              </p>
              <p className="mt-2 text-sm text-gray-600">Active appointment</p>
            </div>
          </div>
        </div>

        {/* Waiting Patients List */}
        <div className="card p-6 animate-slide-up">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-display font-bold text-gray-800">Waiting Patients Queue</h3>
              <p className="mt-1 text-sm text-gray-500">Patients waiting for consultation</p>
            </div>
            <button
              onClick={handleCallNext}
              disabled={waitingPatients.length === 0 || currentAppointment}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Phone size={20} />
              Call Next Patient
            </button>
          </div>

          <div className="space-y-3">
            {waitingPatients.map((appointment, index) => (
              <div
                key={appointment.id}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-primary-300 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-display font-bold text-primary-600">#{appointment.ticketNumber}</span>
                      <span className="text-lg font-semibold text-gray-800">{appointment.patient.name}</span>
                    </div>
                    <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar size={14} />
                      {new Date(appointment.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {waitingPatients.length === 0 && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Users size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No waiting patients</p>
                <p className="text-sm text-gray-400 mt-1">New patients will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Current Appointment */}
        {currentAppointment && (
          <div className="space-y-6 animate-slide-up">
            <div className="card p-6 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50 border-primary-200">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-bold text-gray-800">
                    Current Patient
                  </h3>
                  <p className="mt-1 text-gray-600">
                    {currentAppointment.patient.name} • Ticket #{currentAppointment.ticketNumber}
                  </p>
                </div>
                <button
                  onClick={handleCompleteAppointment}
                  className="btn-success"
                >
                  <CheckCircle size={20} />
                  Complete Appointment
                </button>
              </div>

              {/* Patient Info */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/60 p-4 border border-white/80">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Name</p>
                  <p className="text-base font-semibold text-gray-800">{currentAppointment.patient.name}</p>
                </div>
                <div className="rounded-xl bg-white/60 p-4 border border-white/80">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-base font-semibold text-gray-800">{currentAppointment.patient.phone || "-"}</p>
                </div>
                <div className="rounded-xl bg-white/60 p-4 border border-white/80">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Age</p>
                  <p className="text-base font-semibold text-gray-800">{currentAppointment.patient.age || "-"}</p>
                </div>
                <div className="rounded-xl bg-white/60 p-4 border border-white/80">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Gender</p>
                  <p className="text-base font-semibold text-gray-800">{currentAppointment.patient.gender || "-"}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
                  className="btn-primary"
                >
                  <Plus size={18} />
                  {showPrescriptionForm ? "Hide Prescription Form" : "Add Prescription"}
                </button>
                <button
                  onClick={() => loadPatientHistory(currentAppointment.patientId)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-200 hover:scale-105"
                >
                  <History size={18} />
                  View History
                </button>
              </div>
            </div>

            {/* Prescription Form */}
            {showPrescriptionForm && (
              <div className="card p-8 bg-gradient-to-br from-white via-primary-50/30 to-indigo-50/20 border-primary-200 animate-scale-in">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                      <Stethoscope size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-bold text-gray-800">
                        Create New Prescription
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Fill in the prescription details below</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPrescriptionForm(false)}
                    className="rounded-xl bg-gray-100 p-2 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-800"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreatePrescription} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Diagnosis <span className="text-red-500">*</span>
                      </label>
                    <input
                      type="text"
                      value={prescriptionData.diagnosis}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                        className="input-field"
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
                        className="input-field bg-gray-50 text-gray-600 cursor-not-allowed"
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
                      className="input-field font-mono text-sm"
                      placeholder="Paracetamol 500mg - 1 tablet twice daily&#10;Amoxicillin 250mg - 1 capsule three times daily&#10;..."
                    />
                    <p className="mt-2 text-xs text-gray-500">
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
                      className="input-field"
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
                      className="input-field"
                      placeholder="Any additional notes or observations..."
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                      className="btn-primary flex-1"
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
                              : `${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000')}${report.fileUrl.startsWith('/') ? report.fileUrl : '/' + report.fileUrl}`)
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
                              : `${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000')}${record.fileUrl.startsWith('/') ? record.fileUrl : '/' + record.fileUrl}`)
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
