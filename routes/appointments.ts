import express, { Response } from 'express';
import Appointment from '../models/Appointment';
import User from '../models/User';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all appointments (admin only)
router.get('/admin', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appointments = await Appointment.find()
      .populate('customerId', 'email firstName lastName phone')
      .populate('staffId', 'email firstName lastName')
      .sort({ startAt: -1 });

    res.json({ appointments });
  } catch (error: any) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's appointments
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appointments = await Appointment.find({ customerId: req.user?.userId })
      .populate('staffId', 'email firstName lastName')
      .sort({ startAt: -1 });

    res.json({ appointments });
  } catch (error: any) {
    console.error('Get user appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create appointment
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startAt, endAt, notes, staffId } = req.body;

    if (!startAt || !endAt) {
      res.status(400).json({ error: 'Start and end times are required' });
      return;
    }

    // Validate date strings
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format provided' });
      return;
    }

    if (startDate >= endDate) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }

    // Verify appointment duration is exactly 30 minutes
    const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (durationInMinutes !== 30) {
      res.status(400).json({ error: 'Appointment duration must be exactly 30 minutes' });
      return;
    }

    // Check for overlapping appointments
    const overlappingAppointments = await Appointment.find({
      status: 'scheduled',
      $or: [
        {
          startAt: { $lt: endDate },
          endAt: { $gt: startDate }
        }
      ]
    });

    if (overlappingAppointments.length >= 2) {
      res.status(400).json({ error: 'No available slots for this time. The store can only handle 2 appointments at the same time.' });
      return;
    }

    const appointment = new Appointment({
      customerId: req.user?.userId,
      staffId: staffId || null,
      startAt: startDate,
      endAt: endDate,
      notes: notes || null,
      status: 'scheduled',
    });

    await appointment.save();
    await appointment.populate('staffId', 'email firstName lastName');

    res.status(201).json({ appointment });
  } catch (error: any) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startAt, endAt, status, notes, cancellationReason, staffId } = req.body;

    const appointment = await Appointment.findById(id);
        
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Check if user owns the appointment or is admin
    const isOwner = appointment.customerId.toString() === req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to update this appointment' });
      return;
    }

    // Update fields
    let newStartAt = startAt ? new Date(startAt) : appointment.startAt;
    let newEndAt = endAt ? new Date(endAt) : appointment.endAt;

    // If updating time, verify duration and check for concurrent appointments
    if (startAt || endAt) {
      // Verify appointment duration is exactly 30 minutes
      const durationInMinutes = (newEndAt.getTime() - newStartAt.getTime()) / (1000 * 60);
      if (durationInMinutes !== 30) {
        res.status(400).json({ error: 'Appointment duration must be exactly 30 minutes' });
        return;
      }

      const overlappingAppointments = await Appointment.find({
        _id: { $ne: id },
        status: 'scheduled',
        $or: [
          {
            startAt: { $lt: newEndAt },
            endAt: { $gt: newStartAt }
          }
        ]
      });

      if (overlappingAppointments.length >= 2) {
        res.status(400).json({ error: 'No available slots for this time. The store can only handle 2 appointments at the same time.' });
        return;
      }
    }

    if (startAt) appointment.startAt = newStartAt;
    if (endAt) appointment.endAt = newEndAt;
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    if (cancellationReason !== undefined) appointment.cancellationReason = cancellationReason;
    if (staffId !== undefined) appointment.staffId = staffId || null;

    await appointment.save();
    await appointment.populate('staffId', 'email firstName lastName');

    res.json({ appointment });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete appointment
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
        
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Check if user owns the appointment or is admin
    const isOwner = appointment.customerId.toString() === req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to delete this appointment' });
      return;
    }

    await Appointment.findByIdAndDelete(id);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error: any) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;