import { Timestamp } from 'firebase/firestore';

export type UserRole = 'superadmin' | 'clinic_admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  clinicId: string;
}

export type ClinicStatus = 'active' | 'suspended' | 'trial';

export interface Clinic {
  id: string;
  name: string;
  joinCode: string;
  ownerUid: string;
  createdAt: Timestamp;
  status: ClinicStatus;
  plan: string;
  expiresAt: Timestamp;
  suspendedReason?: string;
}

export interface Patient {
  id: string;
  name: string;
  species: string;
  race?: string;
  sex?: 'macho' | 'hembra' | 'no_especificado';
  isNeutered?: 'si' | 'no' | 'no_informado';
  allergies?: string;
  medicalHistory?: string;
  currentMedication?: string;
  observations?: string;
  emergencyContact?: string;
  age?: number;
  weight?: number;
  ownerName: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownerNeighborhood?: string;
  addressNotes?: string;
  clinicId: string;
  createdAt: Timestamp;
  lastVisitAt?: Timestamp;
  nextVaccineDate?: Timestamp;
}

export type ClinicalEventType = 'consultation' | 'vaccine' | 'treatment' | 'note';

export interface ClinicalEvent {
  id: string;
  patientId: string;
  patientName?: string; // Added for activity feed
  date: Timestamp;
  type: ClinicalEventType;
  description: string;
  nextDate?: Timestamp;
  clinicId: string;
}

export interface ActivityEvent {
  id: string;
  date: Timestamp;
  type: ClinicalEventType | 'appointment' | 'inventory' | 'billing';
  description: string;
  patientId?: string;
  patientName?: string;
  clinicId: string;
  userName?: string;
}

export type ChargeStatus = 'pending' | 'paid';

export interface Charge {
  id: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  date: Timestamp;
  concept: string;
  amount: number;
  status: ChargeStatus;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  clinicId: string;
  updatedAt: Timestamp;
}

export interface Prescription {
  id: string;
  patientId: string;
  clinicId: string;
  date: Timestamp;
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface SOAPNote {
  id: string;
  patientId: string;
  clinicId: string;
  date: Timestamp;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Attachment {
  id: string;
  patientId: string;
  clinicId: string;
  date: Timestamp;
  name: string;
  type: string; // 'image', 'pdf', 'doc', etc.
  url: string;
  size?: number;
}

export type AppointmentStatus = 'pending' | 'in-consultation' | 'attended' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Timestamp;
  reason: string;
  status: AppointmentStatus;
  isHomeVisit?: boolean;
  clinicId: string;
}

export interface InternalLog {
  id: string;
  date: Timestamp;
  content: string;
  patientId?: string;
  clinicId: string;
}
