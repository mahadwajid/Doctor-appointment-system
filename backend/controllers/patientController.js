import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get queue status
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

export const getAllPatients = async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
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
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

export const createPatient = async (req, res) => {
  try {
    const { name, phone, email, age, gender, address } = req.body;

    // Get the highest ticket number
    const lastPatient = await prisma.patient.findFirst({
      orderBy: { ticketNumber: 'desc' },
    });

    const ticketNumber = lastPatient ? lastPatient.ticketNumber + 1 : 1;

    // Convert age to integer or null if empty/invalid
    let ageInt = null;
    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age, 10);
      if (!isNaN(parsedAge) && parsedAge > 0) {
        ageInt = parsedAge;
      }
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        age: ageInt,
        gender: gender || null,
        address: address || null,
        ticketNumber,
      },
    });

    // Create appointment automatically
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        ticketNumber: patient.ticketNumber,
        status: 'WAITING',
      },
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('new-patient', { patient, appointment });
      req.io.emit('queue-update', await getQueueStatus());
    }

    res.json({ patient, appointment, message: 'Patient registered and ticket generated' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const query = req.params.query;
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

