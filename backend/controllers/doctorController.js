import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      include: { user: true },
      orderBy: { name: 'asc' },
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        appointments: {
          include: { patient: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
};

