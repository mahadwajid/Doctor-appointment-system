import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function
const getQueueStatus = async () => {
  const waiting = await prisma.appointment.findMany({
    where: { status: 'WAITING' },
    include: { patient: true },
    orderBy: { ticketNumber: 'asc' },
  });

  const inProgress = await prisma.appointment.findFirst({
    where: { status: 'IN_PROGRESS' },
    include: { patient: true },
    orderBy: { ticketNumber: 'asc' },
  });

  return {
    waiting: waiting.map(a => ({
      ticketNumber: a.ticketNumber,
      patientName: a.patient.name,
      appointmentId: a.id,
    })),
    current: inProgress ? {
      ticketNumber: inProgress.ticketNumber,
      patientName: inProgress.patient.name,
      appointmentId: inProgress.id,
    } : null,
    waitingCount: waiting.length,
  };
};

export const getAllAppointments = async (req, res) => {
  try {
    const { status, doctorId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (doctorId) where.doctorId = doctorId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: { ticketNumber: 'asc' },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getWaitingAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { status: 'WAITING' },
      include: { patient: true },
      orderBy: { ticketNumber: 'asc' },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch waiting appointments' });
  }
};

export const callNextPatient = async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only doctors can call patients' });
    }

    const doctorId = req.user.doctor?.id || req.body.doctorId;

    // Get the next waiting appointment
    const nextAppointment = await prisma.appointment.findFirst({
      where: { status: 'WAITING' },
      include: { patient: true },
      orderBy: { ticketNumber: 'asc' },
    });

    if (!nextAppointment) {
      return res.status(404).json({ error: 'No waiting patients' });
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: nextAppointment.id },
      data: {
        status: 'IN_PROGRESS',
        doctorId: doctorId,
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('patient-called', {
        ticketNumber: updatedAppointment.ticketNumber,
        patientName: updatedAppointment.patient.name,
        appointmentId: updatedAppointment.id,
      });
      req.io.emit('queue-update', await getQueueStatus());
    }

    res.json({ message: 'Patient called', appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to call next patient' });
  }
};

export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    // Emit socket event
    if (req.io) {
      req.io.emit('appointment-completed', { appointmentId: id });
      req.io.emit('queue-update', await getQueueStatus());
    }

    res.json({ message: 'Appointment completed', appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          include: {
            appointments: {
              include: { doctor: true },
              orderBy: { createdAt: 'desc' },
            },
            labReports: { orderBy: { createdAt: 'desc' } },
            prescriptions: {
              include: { doctor: true },
              orderBy: { createdAt: 'desc' },
            },
            medicalRecords: { orderBy: { createdAt: 'desc' } },
          },
        },
        doctor: true,
        prescriptions: true,
        medicalRecords: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

