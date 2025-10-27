import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  customerId: mongoose.Types.ObjectId;
  staffId?: mongoose.Types.ObjectId | null;
  startAt: Date;
  endAt: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string | null;
  cancellationReason?: string | null;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
AppointmentSchema.index({ customerId: 1, startAt: 1 });
AppointmentSchema.index({ staffId: 1, startAt: 1 });
AppointmentSchema.index({ status: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);