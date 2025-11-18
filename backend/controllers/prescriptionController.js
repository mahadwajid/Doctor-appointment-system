import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllPrescriptions = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.query;
    const where = {};

    if (patientId) where.patientId = patientId;
    if (appointmentId) where.appointmentId = appointmentId;

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const createPrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, medications, instructions, diagnosis, notes } = req.body;

    if (!appointmentId || !patientId || !medications) {
      return res.status(400).json({ error: 'Appointment ID, Patient ID, and medications are required' });
    }

    const doctorId = req.user.doctor?.id;
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor profile not found' });
    }

    const prescription = await prisma.prescription.create({
      data: {
        appointmentId,
        patientId,
        doctorId,
        medications: typeof medications === 'string' ? medications : JSON.stringify(medications),
        instructions,
        diagnosis,
        notes,
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('prescription-created', {
        patientId: prescription.patientId,
        appointmentId: prescription.appointmentId,
        prescriptionId: prescription.id,
      });
    }

    res.json({ message: 'Prescription created successfully', prescription });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
};

