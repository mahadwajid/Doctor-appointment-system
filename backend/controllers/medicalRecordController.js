import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/medical-records';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'medical-record-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });

export const getAllMedicalRecords = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.query;
    const where = {};

    if (patientId) where.patientId = patientId;
    if (appointmentId) where.appointmentId = appointmentId;

    const records = await prisma.medicalRecord.findMany({
      where,
      include: {
        patient: true,
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
};

export const createMedicalRecord = async (req, res) => {
  try {
    const { patientId, appointmentId, recordType, title, description } = req.body;

    if (!patientId || !recordType || !title) {
      return res.status(400).json({ error: 'Patient ID, record type, and title are required' });
    }

    const fileUrl = req.file ? `/uploads/medical-records/${req.file.filename}` : null;

    const record = await prisma.medicalRecord.create({
      data: {
        patientId,
        appointmentId: appointmentId || null,
        recordType,
        title,
        description: description || '',
        fileUrl,
      },
      include: {
        patient: true,
        appointment: true,
      },
    });

    res.json({ message: 'Medical record created successfully', record });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const getMedicalRecordById = async (req, res) => {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        appointment: true,
      },
    });

    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medical record' });
  }
};

