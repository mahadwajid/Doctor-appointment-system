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

    // Check if patient already exists (by phone or email)
    let existingPatient = null;
    if (phone) {
      existingPatient = await prisma.patient.findFirst({
        where: { phone: phone },
      });
    }
    
    if (!existingPatient && email) {
      existingPatient = await prisma.patient.findFirst({
        where: { email: email },
      });
    }

    let patient;
    let isNewPatient = false;

    if (existingPatient) {
      // Patient exists - use existing patient
      patient = existingPatient;
      
      // Update patient info if provided (optional updates)
      if (name || age || gender || address) {
        let ageInt = null;
        if (age !== undefined && age !== null && age !== '') {
          const parsedAge = parseInt(age, 10);
          if (!isNaN(parsedAge) && parsedAge > 0) {
            ageInt = parsedAge;
          }
        }

        patient = await prisma.patient.update({
          where: { id: existingPatient.id },
          data: {
            ...(name && { name }),
            ...(ageInt !== null && { age: ageInt }),
            ...(gender && { gender }),
            ...(address && { address }),
          },
        });
      }
    } else {
      // New patient - create with new ticket number
      isNewPatient = true;
      
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

      patient = await prisma.patient.create({
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
    }

    // Get the highest ticket number for appointment
    const lastAppointment = await prisma.appointment.findFirst({
      orderBy: { ticketNumber: 'desc' },
    });
    const appointmentTicketNumber = lastAppointment ? lastAppointment.ticketNumber + 1 : 1;

    // Create appointment automatically
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        ticketNumber: appointmentTicketNumber,
        status: 'WAITING',
      },
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('new-patient', { patient, appointment });
      req.io.emit('queue-update', await getQueueStatus());
    }

    res.json({ 
      patient, 
      appointment, 
      isNewPatient,
      message: isNewPatient 
        ? 'Patient registered and ticket generated' 
        : 'Appointment created for existing patient' 
    });
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

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, age, gender, address } = req.body;

    // Convert age to integer or null if empty/invalid
    let ageInt = null;
    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age, 10);
      if (!isNaN(parsedAge) && parsedAge > 0) {
        ageInt = parsedAge;
      }
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        email: email || null,
        age: ageInt,
        gender: gender || null,
        address: address || null,
      },
    });

    res.json({ message: 'Patient updated successfully', patient });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient has any active appointments
    // Only check if not Super Admin (Super Admin can delete regardless)
    if (req.user.role !== 'SUPER_ADMIN') {
      const activeAppointments = await prisma.appointment.findFirst({
        where: {
          patientId: id,
          status: {
            in: ['WAITING', 'IN_PROGRESS'],
          },
        },
      });

      if (activeAppointments) {
        return res.status(400).json({ 
          error: 'Cannot delete patient with active appointments. Please complete or cancel appointments first.' 
        });
      }
    }

    // Delete patient (cascade will delete related records)
    await prisma.patient.delete({
      where: { id },
    });

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

