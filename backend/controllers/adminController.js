import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { doctor: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const { email, password, name, specialization, licenseNumber, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'DOCTOR',
      },
    });

    // Create doctor
    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        name,
        specialization,
        licenseNumber,
        phone,
        email,
      },
    });

    // Update user with doctorId
    await prisma.user.update({
      where: { id: user.id },
      data: { doctorId: doctor.id },
    });

    res.json({ message: 'Doctor created successfully', user, doctor });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialization, licenseNumber, phone, email, isActive } = req.body;

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        name,
        specialization,
        licenseNumber,
        phone,
        email,
        isActive,
      },
    });

    res.json({ message: 'Doctor updated successfully', doctor });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctor.findUnique({ where: { id } });

    if (doctor) {
      await prisma.user.delete({ where: { id: doctor.userId } });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const createReceptionist = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'RECEPTIONIST',
      },
    });

    res.json({ message: 'Receptionist created successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const createLabStaff = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'LAB_STAFF',
      },
    });

    res.json({ message: 'Lab staff created successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      waitingAppointments,
      todayAppointments,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.doctor.count({ where: { isActive: true } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'WAITING' } }),
      prisma.appointment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.json({
      totalPatients,
      totalDoctors,
      totalAppointments,
      waitingAppointments,
      todayAppointments,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

export const getSystemLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      take: limit,
      include: {
        patient: { select: { name: true, ticketNumber: true } },
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get recent prescriptions
    const recentPrescriptions = await prisma.prescription.findMany({
      take: limit,
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get recent lab reports
    const recentLabReports = await prisma.labReport.findMany({
      take: limit,
      include: {
        patient: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get recent users created
    const recentUsers = await prisma.user.findMany({
      take: limit,
      include: { doctor: true },
      orderBy: { createdAt: 'desc' },
    });

    // Combine and format logs
    const logs = [
      ...recentAppointments.map(apt => ({
        type: 'APPOINTMENT',
        action: `Appointment ${apt.status.toLowerCase()} - Ticket #${apt.ticketNumber}`,
        details: `Patient: ${apt.patient.name}${apt.doctor ? ` | Doctor: ${apt.doctor.name}` : ''}`,
        timestamp: apt.createdAt,
        id: apt.id,
      })),
      ...recentPrescriptions.map(pres => ({
        type: 'PRESCRIPTION',
        action: 'Prescription created',
        details: `Patient: ${pres.patient.name} | Doctor: ${pres.doctor.name}`,
        timestamp: pres.createdAt,
        id: pres.id,
      })),
      ...recentLabReports.map(report => ({
        type: 'LAB_REPORT',
        action: `Lab report uploaded: ${report.testName}`,
        details: `Patient: ${report.patient.name}`,
        timestamp: report.createdAt,
        id: report.id,
      })),
      ...recentUsers.map(user => ({
        type: 'USER',
        action: `User created: ${user.role}`,
        details: `Name: ${user.name} | Email: ${user.email}`,
        timestamp: user.createdAt,
        id: user.id,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
};

