import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getQueueStatus = async (req, res) => {
  try {
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

    const nextInLine = waiting.length > 0 ? waiting[0] : null;

    res.json({
      current: inProgress ? {
        ticketNumber: inProgress.ticketNumber,
        patientName: inProgress.patient.name,
      } : null,
      next: nextInLine ? {
        ticketNumber: nextInLine.ticketNumber,
        patientName: nextInLine.patient.name,
      } : null,
      waitingCount: waiting.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
};

