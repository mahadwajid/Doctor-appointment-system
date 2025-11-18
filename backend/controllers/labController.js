import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/lab-reports';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lab-report-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });

export const getAllLabReports = async (req, res) => {
  try {
    const { patientId } = req.query;
    const where = patientId ? { patientId } : {};

    const reports = await prisma.labReport.findMany({
      where,
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lab reports' });
  }
};

export const uploadLabReport = async (req, res) => {
  try {
    const { patientId, testName, testType, results, notes } = req.body;

    if (!patientId || !testName) {
      return res.status(400).json({ error: 'Patient ID and test name are required' });
    }

    const fileUrl = req.file ? `/uploads/lab-reports/${req.file.filename}` : null;

    const report = await prisma.labReport.create({
      data: {
        patientId,
        testName,
        testType,
        results: results || '',
        fileUrl,
        uploadedBy: req.user.id,
        notes,
      },
      include: { patient: true },
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('lab-report-uploaded', {
        patientId: report.patientId,
        reportId: report.id,
        testName: report.testName,
      });
    }

    res.json({ message: 'Lab report uploaded successfully', report });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const getLabReportById = async (req, res) => {
  try {
    const report = await prisma.labReport.findUnique({
      where: { id: req.params.id },
      include: { patient: true },
    });

    if (!report) {
      return res.status(404).json({ error: 'Lab report not found' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lab report' });
  }
};

