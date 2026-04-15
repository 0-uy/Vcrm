import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  NotificationConfig, 
  Patient, 
  Appointment
} from '../types';
import { subDays, subHours, format } from 'date-fns';
import { es } from 'date-fns/locale';

const DEFAULT_CONFIG: NotificationConfig = {
  clinicId: '',
  vaccineReminderDays: 7,
  appointmentReminderHours: 24,
  treatmentReminderEnabled: true,
  channels: ['in-app']
};

export const getNotificationConfig = async (clinicId: string): Promise<NotificationConfig> => {
  const configRef = doc(db, 'notification_configs', clinicId);
  const configSnap = await getDoc(configRef);
  
  if (configSnap.exists()) {
    return configSnap.data() as NotificationConfig;
  }
  
  const newConfig = { ...DEFAULT_CONFIG, clinicId };
  await setDoc(configRef, newConfig);
  return newConfig;
};

/**
 * Creates a scheduled notification for an appointment
 */
export const scheduleAppointmentNotification = async (
  clinicId: string, 
  appointment: Appointment,
  patient: Patient
) => {
  const config = await getNotificationConfig(clinicId);
  const appDate = appointment.date.toDate();
  const scheduledDate = subHours(appDate, config.appointmentReminderHours);
  
  const relatedId = `app_${appointment.id}`;
  
  // Check if already exists to avoid duplicates
  const q = query(
    collection(db, 'notifications'), 
    where('clinicId', '==', clinicId),
    where('relatedId', '==', relatedId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(collection(db, 'notifications'), {
    clinicId,
    patientId: patient.id,
    patientName: patient.name,
    ownerName: patient.ownerName,
    ownerPhone: patient.ownerPhone,
    type: 'appointment',
    title: 'Recordatorio de Cita',
    message: `Cita programada para mañana a las ${format(appDate, 'HH:mm')}.`,
    scheduledDate: Timestamp.fromDate(scheduledDate),
    status: 'pending',
    channels: config.channels,
    relatedId,
    createdAt: Timestamp.now()
  });
};

/**
 * Creates a scheduled notification for a vaccine
 */
export const scheduleVaccineNotification = async (
  clinicId: string,
  patient: Patient,
  vaccineName: string,
  nextDate: Date
) => {
  const config = await getNotificationConfig(clinicId);
  const scheduledDate = subDays(nextDate, config.vaccineReminderDays);
  
  const relatedId = `vaccine_${patient.id}_${format(nextDate, 'yyyyMMdd')}`;
  
  const q = query(
    collection(db, 'notifications'), 
    where('clinicId', '==', clinicId),
    where('relatedId', '==', relatedId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(collection(db, 'notifications'), {
    clinicId,
    patientId: patient.id,
    patientName: patient.name,
    ownerName: patient.ownerName,
    ownerPhone: patient.ownerPhone,
    type: 'vaccine',
    title: 'Recordatorio de Vacuna',
    message: `Próxima vacuna (${vaccineName}) para ${patient.name} el ${format(nextDate, "d 'de' MMMM", { locale: es })}.`,
    scheduledDate: Timestamp.fromDate(scheduledDate),
    status: 'pending',
    channels: config.channels,
    relatedId,
    createdAt: Timestamp.now()
  });
};

/**
 * Creates a notification for a treatment
 */
export const scheduleTreatmentNotification = async (
  clinicId: string,
  patient: Patient,
  medication: string
) => {
  const config = await getNotificationConfig(clinicId);
  if (!config.treatmentReminderEnabled) return;

  const relatedId = `treatment_${patient.id}_${Date.now()}`;

  await addDoc(collection(db, 'notifications'), {
    clinicId,
    patientId: patient.id,
    patientName: patient.name,
    ownerName: patient.ownerName,
    ownerPhone: patient.ownerPhone,
    type: 'treatment',
    title: 'Seguimiento de Tratamiento',
    message: `Recordatorio de medicación para ${patient.name}: ${medication}.`,
    scheduledDate: Timestamp.now(),
    status: 'pending',
    channels: config.channels,
    relatedId,
    createdAt: Timestamp.now()
  });
};

// syncNotifications removed to prevent mass creation from frontend
