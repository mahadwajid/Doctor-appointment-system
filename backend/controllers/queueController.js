import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getQueueStatus = async (req, res) => {
  try {
    // Get only WAITING appointments (not completed or cancelled)
    const waiting = await prisma.appointment.findMany({
      where: { 
        status: 'WAITING'
      },
      include: { patient: true },
      orderBy: { ticketNumber: 'asc' },
    });

    // Get only IN_PROGRESS appointments (not completed)
    const inProgress = await prisma.appointment.findFirst({
      where: { 
        status: 'IN_PROGRESS'
      },
      include: { patient: true },
      orderBy: { ticketNumber: 'asc' },
    });

    const nextInLine = waiting.length > 0 ? waiting[0] : null;

    const result = {
      current: inProgress ? {
        ticketNumber: inProgress.ticketNumber,
        patientName: inProgress.patient.name,
      } : null,
      next: nextInLine ? {
        ticketNumber: nextInLine.ticketNumber,
        patientName: nextInLine.patient.name,
      } : null,
      waitingCount: waiting.length,
    };

    // Prevent caching - always return fresh data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
};

