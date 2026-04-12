import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'veterinarian';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  clinicId: string;
}

export interface Patient {
  id: string;
  name: string;
  species: string;
  race?: string;
  age?: number;
  weight?: number;
  ownerName: string;
  ownerPhone?: string;
  clinicId: string;
  createdAt: Timestamp;
}

export type ClinicalEventType = 'consultation' | 'vaccine' | 'treatment' | 'note';

export interface ClinicalEvent {
  id: string;
  patientId: string;
  date: Timestamp;
  type: ClinicalEventType;
  description: string;
  nextDate?: Timestamp;
  clinicId: string;
}

export type AppointmentStatus = 'pending' | 'attended' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Timestamp;
  reason: string;
  status: AppointmentStatus;
  clinicId: string;
}

export interface InternalLog {
  id: string;
  date: Timestamp;
  content: string;
  patientId?: string;
  clinicId: string;
}
