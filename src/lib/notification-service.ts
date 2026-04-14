import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp,
  orderBy,
  limit,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Notification, 
  NotificationConfig, 
  Patient, 
  Appointment, 
  Prescription,
  NotificationType
} from '../types';
import { addDays, subDays, subHours, isBefore, isAfter, format, startOfDay, endOfDay } from 'date-fns';
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

export const syncNotifications = async (clinicId: string) => {
  console.log('Syncing notifications for clinic:', clinicId);
  const config = await getNotificationConfig(clinicId);
  const now = new Date();

  // 1. Sync Vaccine Reminders
  await syncVaccineReminders(clinicId, config);

  // 2. Sync Appointment Reminders
  await syncAppointmentReminders(clinicId, config);

  // 3. Sync Treatment Reminders
  await syncTreatmentReminders(clinicId, config);
};

async function syncVaccineReminders(clinicId: string, config: NotificationConfig) {
  const now = new Date();
  const targetDate = addDays(now, config.vaccineReminderDays);
  
  // Find patients with nextVaccineDate coming up
  const q = query(
    collection(db, 'patients'),
    where('clinicId', '==', clinicId),
    where('nextVaccineDate', '>=', Timestamp.fromDate(startOfDay(now))),
    where('nextVaccineDate', '<=', Timestamp.fromDate(endOfDay(targetDate)))
  );

  const snapshot = await getDocs(q);
  
  for (const patientDoc of snapshot.docs) {
    const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;
    const vaccineDate = patient.nextVaccineDate?.toDate();
    
    if (!vaccineDate) continue;

    const relatedId = `vaccine_${patient.id}_${format(vaccineDate, 'yyyyMMdd')}`;
    
    // Check if notification already exists
    const existingQ = query(
      collection(db, 'notifications'),
      where('clinicId', '==', clinicId),
      where('relatedId', '==', relatedId)
    );
    
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.empty) {
      await addDoc(collection(db, 'notifications'), {
        clinicId,
        patientId: patient.id,
        patientName: patient.name,
        ownerName: patient.ownerName,
        ownerPhone: patient.ownerPhone,
        type: 'vaccine',
        title: 'Recordatorio de Vacuna',
        message: `Próxima vacuna para ${patient.name} el ${format(vaccineDate, "d 'de' MMMM", { locale: es })}.`,
        scheduledDate: Timestamp.fromDate(subDays(vaccineDate, config.vaccineReminderDays)),
        status: 'pending',
        channels: config.channels,
        relatedId,
        createdAt: Timestamp.now()
      });
    }
  }
}

async function syncAppointmentReminders(clinicId: string, config: NotificationConfig) {
  const now = new Date();
  const tomorrow = addDays(now, 1);
  
  const q = query(
    collection(db, 'appointments'),
    where('clinicId', '==', clinicId),
    where('status', '==', 'pending'),
    where('date', '>=', Timestamp.fromDate(now)),
    where('date', '<=', Timestamp.fromDate(tomorrow))
  );

  const snapshot = await getDocs(q);
  
  for (const appDoc of snapshot.docs) {
    const app = { id: appDoc.id, ...appDoc.data() } as Appointment;
    const appDate = app.date.toDate();
    
    const relatedId = `app_${app.id}`;
    
    const existingQ = query(
      collection(db, 'notifications'),
      where('clinicId', '==', clinicId),
      where('relatedId', '==', relatedId)
    );
    
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.empty) {
      await addDoc(collection(db, 'notifications'), {
        clinicId,
        patientId: app.patientId,
        patientName: app.patientName,
        ownerName: '', // Would need to fetch patient to get owner info if needed
        type: 'appointment',
        title: 'Recordatorio de Cita',
        message: `Cita programada para mañana a las ${format(appDate, 'HH:mm')}.`,
        scheduledDate: Timestamp.fromDate(subHours(appDate, config.appointmentReminderHours)),
        status: 'pending',
        channels: config.channels,
        relatedId,
        createdAt: Timestamp.now()
      });
    }
  }
}

async function syncTreatmentReminders(clinicId: string, config: NotificationConfig) {
  if (!config.treatmentReminderEnabled) return;

  const now = new Date();
  
  // This is more complex as prescriptions don't have a "next dose" field usually.
  // For this demo, we'll look at prescriptions created in the last 7 days.
  const q = query(
    collection(db, 'prescriptions'),
    where('clinicId', '==', clinicId),
    where('date', '>=', Timestamp.fromDate(subDays(now, 7)))
  );

  const snapshot = await getDocs(q);
  
  for (const presDoc of snapshot.docs) {
    const pres = { id: presDoc.id, ...presDoc.data() } as Prescription;
    
    // Logic to determine if a reminder is needed today
    // Simplified: one reminder per prescription for now
    const relatedId = `treatment_${pres.id}_${format(now, 'yyyyMMdd')}`;
    
    const existingQ = query(
      collection(db, 'notifications'),
      where('clinicId', '==', clinicId),
      where('relatedId', '==', relatedId)
    );
    
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.empty) {
      await addDoc(collection(db, 'notifications'), {
        clinicId,
        patientId: pres.patientId,
        patientName: 'Paciente', // Would need to fetch patient
        ownerName: '',
        type: 'treatment',
        title: 'Seguimiento de Tratamiento',
        message: `Recordatorio de medicación: ${pres.medication} (${pres.dose}).`,
        scheduledDate: Timestamp.now(),
        status: 'pending',
        channels: config.channels,
        relatedId,
        createdAt: Timestamp.now()
      });
    }
  }
}
