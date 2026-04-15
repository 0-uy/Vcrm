import React, { useState, useEffect, useRef } from 'react';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Stethoscope, 
  Syringe, 
  FileText, 
  Clock,
  Trash2,
  Edit2,
  AlertCircle,
  AlertTriangle,
  MoreHorizontal,
  MapPin,
  Home,
  DollarSign,
  CreditCard,
  Receipt,
  Pill,
  ClipboardType,
  Paperclip,
  FileUp,
  ExternalLink,
  Download,
  Users,
  Phone,
  Dog,
  Camera,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { Patient, ClinicalEvent, ClinicalEventType, Charge, ChargeStatus, Prescription, SOAPNote, Attachment, PaymentMethod } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import MedicalRecordPDF from './MedicalRecordPDF';
import WeightChart from './WeightChart';

import PatientForm from './PatientForm';
import { handleFirestoreError, OperationType, logActivity, generateSearchKeywords } from '../lib/firestore-utils';
import { scheduleVaccineNotification, scheduleTreatmentNotification } from '../lib/notification-service';

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({ patient, onBack }) => {
  const { profile, clinic } = useAuth();
  const [history, setHistory] = useState<ClinicalEvent[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [isAddPrescriptionOpen, setIsAddPrescriptionOpen] = useState(false);
  const [isAddSOAPOpen, setIsAddSOAPOpen] = useState(false);
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  
  const [editPatient, setEditPatient] = useState<Partial<Patient>>({});
  const [newEvent, setNewEvent] = useState<Partial<ClinicalEvent>>({
    type: 'consultation',
    date: Timestamp.now(),
    weight: patient.weight,
  });
  const [newCharge, setNewCharge] = useState<Partial<Charge>>({
    concept: 'Consulta',
    amount: 0,
    status: 'pending',
    method: 'efectivo',
    date: Timestamp.now(),
  });
  const [newPrescription, setNewPrescription] = useState<Partial<Prescription>>({
    medication: '',
    dose: '',
    frequency: '',
    duration: '',
    date: Timestamp.now(),
  });
  const [newSOAP, setNewSOAP] = useState<Partial<SOAPNote>>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    date: Timestamp.now(),
  });
  const [newAttachment, setNewAttachment] = useState<Partial<Attachment>>({
    name: '',
    url: '',
    type: 'image',
    date: Timestamp.now(),
  });

  useEffect(() => {
    console.log('PatientDetailView mounted/updated. Clinic:', clinic);
    setIsMounted(true);
  }, [clinic]);

  useEffect(() => {
    setEditPatient(patient);
  }, [patient]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'patients', patient.id, 'history'),
      where('clinicId', '==', profile.clinicId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalEvent)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `patients/${patient.id}/history`);
    });

    // Fetch charges
    const qCharges = query(
      collection(db, 'charges'),
      where('patientId', '==', patient.id),
      where('clinicId', '==', profile.clinicId)
    );

    const unsubscribeCharges = onSnapshot(qCharges, (snapshot) => {
      setCharges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charge)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'charges');
    });

    // Fetch appointments
    const qApps = query(
      collection(db, 'appointments'),
      where('patientId', '==', patient.id),
      where('clinicId', '==', profile.clinicId)
    );

    const unsubscribeApps = onSnapshot(qApps, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    // Fetch prescriptions
    const qPrescriptions = query(
      collection(db, 'prescriptions'),
      where('patientId', '==', patient.id),
      where('clinicId', '==', profile.clinicId)
    );
    const unsubscribePrescriptions = onSnapshot(qPrescriptions, (snapshot) => {
      setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prescriptions');
    });

    // Fetch SOAP notes
    const qSOAP = query(
      collection(db, 'soap_notes'),
      where('patientId', '==', patient.id),
      where('clinicId', '==', profile.clinicId)
    );
    const unsubscribeSOAP = onSnapshot(qSOAP, (snapshot) => {
      setSoapNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOAPNote)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'soap_notes');
    });

    // Fetch attachments
    const qAttachments = query(
      collection(db, 'attachments'),
      where('patientId', '==', patient.id),
      where('clinicId', '==', profile.clinicId)
    );
    const unsubscribeAttachments = onSnapshot(qAttachments, (snapshot) => {
      setAttachments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attachment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attachments');
    });

    return () => {
      unsubscribe();
      unsubscribeCharges();
      unsubscribePrescriptions();
      unsubscribeSOAP();
      unsubscribeAttachments();
    };
  }, [profile, patient.id]);

  const handleAddEvent = async () => {
    if (!profile || !newEvent.description) {
      toast.error('Por favor completa la descripción.');
      return;
    }

    try {
      // 1. Add clinical event to patient history
      await addDoc(collection(db, 'patients', patient.id, 'history'), {
        ...newEvent,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
        weight: newEvent.weight || null,
        height: newEvent.height || null,
      });

      // 2. Update patient metadata
      const searchKeywords = generateSearchKeywords([
        patient.name,
        patient.ownerName,
        patient.ownerPhone,
        patient.species,
        patient.race,
        patient.observations,
        patient.allergies,
        patient.medicalHistory,
        patient.currentMedication,
        newEvent.description,
        ...(history.map(e => e.description)),
        ...(prescriptions.map(p => p.medication)),
        ...(soapNotes.map(s => s.assessment))
      ]);

      const patientUpdate: any = {
        lastVisitAt: newEvent.date || Timestamp.now(),
        searchKeywords
      };
      if (newEvent.weight) {
        patientUpdate.weight = newEvent.weight;
      }
      if (newEvent.type === 'vaccine' && newEvent.nextDate) {
        patientUpdate.nextVaccineDate = newEvent.nextDate;
        
        // Schedule notification
        await scheduleVaccineNotification(profile.clinicId, patient, newEvent.description || 'Vacuna', newEvent.nextDate.toDate());

        // 2b. Add to root vaccines collection for clinic-wide alerts
        await addDoc(collection(db, 'vaccines'), {
          patientId: patient.id,
          patientName: patient.name,
          clinicId: profile.clinicId,
          type: newEvent.description,
          date: newEvent.date || Timestamp.now(),
          nextDate: newEvent.nextDate,
          status: 'pending'
        });
      }
      await updateDoc(doc(db, 'patients', patient.id), patientUpdate);

      // 3. Add to global activity collection
      await logActivity({
        type: newEvent.type as any,
        description: `${newEvent.type === 'vaccine' ? 'Vacunación' : 'Consulta'} para ${patient.name}: ${newEvent.description}`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
      });

      setIsAddEventOpen(false);
      setNewEvent({ type: 'consultation', date: Timestamp.now() });
      toast.success('Evento agregado correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `patients/${patient.id}/history`);
    }
  };

  const handleUpdatePatient = async (data: Partial<Patient>, newAttachments: any[]) => {
    if (!profile || !data.name || !data.ownerName) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      const searchKeywords = generateSearchKeywords([
        data.name,
        data.ownerName,
        data.ownerPhone,
        data.species,
        data.race,
        data.observations,
        data.allergies,
        data.medicalHistory,
        data.currentMedication,
        ...(history.map(e => e.description)),
        ...(prescriptions.map(p => p.medication)),
        ...(soapNotes.map(s => s.assessment))
      ]);

      await updateDoc(doc(db, 'patients', patient.id), {
        ...data,
        updatedAt: Timestamp.now(),
        searchKeywords
      });

      // Handle new attachments
      for (const att of newAttachments) {
        if (!att.url && att.preview) {
          await addDoc(collection(db, 'attachments'), {
            patientId: patient.id,
            clinicId: profile.clinicId,
            date: Timestamp.now(),
            name: att.name,
            type: att.type,
            url: att.preview,
            size: att.size || 0
          });
        }
      }

      await logActivity({
        type: 'consultation',
        description: `Actualizó información del paciente "${patient.name}"`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId
      });

      setIsEditPatientOpen(false);
      toast.success('Información actualizada correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    }
  };

  const handleAddCharge = async () => {
    if (!profile || !newCharge.concept || !newCharge.amount) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      await addDoc(collection(db, 'charges'), {
        ...newCharge,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
        date: Timestamp.now(),
      });

      await logActivity({
        type: 'billing',
        description: `Nuevo cargo para ${patient.name}: ${newCharge.concept} ($${newCharge.amount})`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
      });

      setIsAddChargeOpen(false);
      setNewCharge({ 
        concept: 'Consulta', 
        amount: 0, 
        status: 'pending', 
        method: 'efectivo',
        date: Timestamp.now() 
      });
      toast.success('Cargo registrado correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'charges');
    }
  };

  const toggleChargeStatus = async (charge: Charge) => {
    if (!profile) return;
    const newStatus: ChargeStatus = charge.status === 'pending' ? 'paid' : 'pending';
    try {
      await updateDoc(doc(db, 'charges', charge.id), { status: newStatus });
      toast.success(`Cargo marcado como ${newStatus === 'paid' ? 'Pagado' : 'Pendiente'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `charges/${charge.id}`);
    }
  };

  const handleAddPrescription = async () => {
    if (!profile || !newPrescription.medication || !newPrescription.dose) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      await addDoc(collection(db, 'prescriptions'), {
        ...newPrescription,
        patientId: patient.id,
        clinicId: profile.clinicId,
        date: Timestamp.now(),
      });

      // Update patient keywords
      const searchKeywords = generateSearchKeywords([
        patient.name,
        patient.ownerName,
        patient.ownerPhone,
        patient.species,
        patient.race,
        patient.observations,
        patient.allergies,
        patient.medicalHistory,
        patient.currentMedication,
        newPrescription.medication,
        ...(history.map(e => e.description)),
        ...(prescriptions.map(p => p.medication)),
        ...(soapNotes.map(s => s.assessment))
      ]);
      await updateDoc(doc(db, 'patients', patient.id), { searchKeywords });

      await logActivity({
        type: 'treatment',
        description: `Nueva receta para ${patient.name}: ${newPrescription.medication}`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
      });

      // Schedule treatment notification
      await scheduleTreatmentNotification(profile.clinicId, patient, newPrescription.medication);

      setIsAddPrescriptionOpen(false);
      setNewPrescription({ medication: '', dose: '', frequency: '', duration: '', date: Timestamp.now() });
      toast.success('Receta agregada correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prescriptions');
    }
  };

  const handleDeletePrescription = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'prescriptions', id));
      toast.success('Receta eliminada correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `prescriptions/${id}`);
    }
  };

  const handleAddSOAP = async () => {
    if (!profile || !newSOAP.assessment) {
      toast.error('Por favor completa al menos el diagnóstico/evaluación.');
      return;
    }

    try {
      await addDoc(collection(db, 'soap_notes'), {
        ...newSOAP,
        patientId: patient.id,
        clinicId: profile.clinicId,
        date: Timestamp.now(),
      });

      // Update patient keywords
      const searchKeywords = generateSearchKeywords([
        patient.name,
        patient.ownerName,
        patient.ownerPhone,
        patient.species,
        patient.race,
        patient.observations,
        patient.allergies,
        patient.medicalHistory,
        patient.currentMedication,
        newSOAP.assessment,
        ...(history.map(e => e.description)),
        ...(prescriptions.map(p => p.medication)),
        ...(soapNotes.map(s => s.assessment))
      ]);
      await updateDoc(doc(db, 'patients', patient.id), { searchKeywords });

      await logActivity({
        type: 'consultation',
        description: `Nueva nota SOAP para ${patient.name}`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
      });

      setIsAddSOAPOpen(false);
      setNewSOAP({ subjective: '', objective: '', assessment: '', plan: '', date: Timestamp.now() });
      toast.success('Nota SOAP guardada.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'soap_notes');
    }
  };

  const handleAddAttachment = async () => {
    if (!profile || !newAttachment.name || !newAttachment.url) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      await addDoc(collection(db, 'attachments'), {
        ...newAttachment,
        patientId: patient.id,
        clinicId: profile.clinicId,
        date: Timestamp.now(),
      });

      await logActivity({
        type: 'note',
        description: `Nuevo adjunto para ${patient.name}: ${newAttachment.name}`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
      });

      setIsAddAttachmentOpen(false);
      setNewAttachment({ name: '', url: '', type: 'image', date: Timestamp.now() });
      toast.success('Adjunto registrado.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attachments');
    }
  };

  const getEventIcon = (type: ClinicalEventType) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="w-4 h-4" />;
      case 'vaccine': return <Syringe className="w-4 h-4" />;
      case 'treatment': return <Clock className="w-4 h-4" />;
      case 'note': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: ClinicalEventType) => {
    switch (type) {
      case 'consultation': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'vaccine': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'treatment': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'note': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const vaccines = history.filter(e => e.type === 'vaccine');
  const nextVaccines = vaccines.filter(v => v.nextDate && isAfter(v.nextDate.toDate(), new Date()));
  const overdueVaccines = vaccines.filter(v => v.nextDate && isBefore(v.nextDate.toDate(), new Date()));

  const totalPaid = charges.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const totalPending = charges.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const lastPayment = charges.filter(c => c.status === 'paid').sort((a, b) => b.date.toMillis() - a.date.toMillis())[0];
  const nextAppointment = appointments.filter(a => a.status === 'pending' && isAfter(a.date.toDate(), new Date())).sort((a, b) => a.date.toMillis() - b.date.toMillis())[0];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary/10 transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-1">
            <h2 className="text-4xl font-black tracking-tight">{patient.name}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-3 py-1 rounded-full font-bold">
                {patient.species}
              </Badge>
              {totalPending > 0 ? (
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none px-3 py-1 rounded-full font-bold shadow-lg shadow-orange-500/20">
                  Debe ${totalPending.toFixed(2)}
                </Badge>
              ) : (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-3 py-1 rounded-full font-bold shadow-lg shadow-emerald-500/20">
                  Al día
                </Badge>
              )}
            </div>
          </div>
          <div className="text-muted-foreground font-medium flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary/70" />
              Dueño: <span className="text-foreground font-bold">{patient.ownerName}</span> 
            </div>
            {patient.ownerPhone && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-primary/70" /> {patient.ownerPhone}
                </span>
              </>
            )}
            <span className="text-muted-foreground/30">•</span>
            <span className="flex items-center gap-1.5">
              <Dog className="w-4 h-4 text-primary/70" /> {patient.race || 'Sin raza'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-primary/10 hover:bg-primary/5">
                <Edit2 className="w-4 h-4" /> Editar Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] glass border-none shadow-2xl p-0 overflow-hidden rounded-[2rem]">
              <div className="p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-3xl font-black tracking-tight">Editar Paciente</DialogTitle>
                </DialogHeader>
                <PatientForm 
                  initialData={patient}
                  onSubmit={handleUpdatePatient} 
                  onCancel={() => setIsEditPatientOpen(false)} 
                  title="Editar Paciente" 
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20 px-6">
                <Plus className="w-4 h-4" /> Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass dark:glass-dark border border-white/10 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Agregar Evento Clínico</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Evento</Label>
                    <Select 
                      value={newEvent.type || ""} 
                      onValueChange={v => setNewEvent({...newEvent, type: v as ClinicalEventType})}
                    >
                      <SelectTrigger className="rounded-xl bg-primary/5 border-primary/10">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="consultation">Consulta</SelectItem>
                        <SelectItem value="vaccine">Vacuna</SelectItem>
                        <SelectItem value="treatment">Tratamiento</SelectItem>
                        <SelectItem value="note">Nota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      className="rounded-xl bg-primary/5 border-primary/10 focus:bg-background transition-all"
                      value={format(newEvent.date?.toDate() || new Date(), 'yyyy-MM-dd')}
                      onChange={e => setNewEvent({...newEvent, date: Timestamp.fromDate(new Date(e.target.value))})}
                    />
                  </div>
                </div>
                
                {newEvent.type === 'vaccine' && (
                  <div className="space-y-2">
                    <Label htmlFor="nextDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Próxima Dosis (Opcional)</Label>
                    <Input 
                      id="nextDate" 
                      type="date" 
                      className="rounded-xl bg-primary/5 border-primary/10 focus:bg-background transition-all"
                      onChange={e => setNewEvent({...newEvent, nextDate: Timestamp.fromDate(new Date(e.target.value))})}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Peso (kg)</Label>
                    <Input 
                      id="weight" 
                      type="number" 
                      step="0.1"
                      placeholder="0.0" 
                      className="rounded-xl bg-primary/5 border-primary/10 focus:bg-background transition-all"
                      value={newEvent.weight || ''}
                      onChange={e => setNewEvent({...newEvent, weight: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Talla (cm)</Label>
                    <Input 
                      id="height" 
                      type="number" 
                      placeholder="0" 
                      className="rounded-xl bg-primary/5 border-primary/10 focus:bg-background transition-all"
                      value={newEvent.height || ''}
                      onChange={e => setNewEvent({...newEvent, height: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción / Notas</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Detalles de la consulta, vacuna aplicada, etc." 
                    className="min-h-[120px] rounded-xl bg-primary/5 border-primary/10 focus:bg-background transition-all"
                    value={newEvent.description || ''}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsAddEventOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleAddEvent} className="rounded-xl px-8 shadow-lg shadow-primary/20">Guardar Evento</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5">
                <DollarSign className="w-4 h-4" /> Nuevo Cargo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] glass dark:glass-dark border border-white/10 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Registrar Cargo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="concept" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Concepto *</Label>
                  <Select 
                    value={newCharge.concept || ""} 
                    onValueChange={v => setNewCharge({...newCharge, concept: v})}
                  >
                    <SelectTrigger className="rounded-xl bg-primary/5 border-primary/10">
                      <SelectValue placeholder="Seleccionar concepto" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Consulta">Consulta</SelectItem>
                      <SelectItem value="Vacuna">Vacuna</SelectItem>
                      <SelectItem value="Tratamiento">Tratamiento</SelectItem>
                      <SelectItem value="Cirugía">Cirugía</SelectItem>
                      <SelectItem value="Medicamento">Medicamento</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto ($) *</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    className="rounded-xl bg-primary/5 border-primary/10 focus:bg-background transition-all"
                    value={newCharge.amount || ''} 
                    onChange={e => setNewCharge({...newCharge, amount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</Label>
                  <Select 
                    value={newCharge.status || ""} 
                    onValueChange={v => setNewCharge({...newCharge, status: v as ChargeStatus})}
                  >
                    <SelectTrigger className="rounded-xl bg-primary/5 border-primary/10">
                      <SelectValue placeholder="Estado del pago" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Método de Pago</Label>
                  <Select 
                    value={newCharge.method || ""} 
                    onValueChange={v => setNewCharge({...newCharge, method: v as PaymentMethod})}
                  >
                    <SelectTrigger className="rounded-xl bg-primary/5 border-primary/10">
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsAddChargeOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleAddCharge} className="rounded-xl px-8 shadow-lg shadow-primary/20">Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New PMS Dialogs */}
          <Dialog open={isAddPrescriptionOpen} onOpenChange={setIsAddPrescriptionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Pill className="w-4 h-4" /> Receta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass dark:glass-dark border border-white/10 shadow-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Receta</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="medication">Medicamento *</Label>
                  <Input 
                    id="medication" 
                    placeholder="Ej: Amoxicilina 500mg" 
                    value={newPrescription.medication}
                    onChange={e => setNewPrescription({...newPrescription, medication: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dose">Dosis *</Label>
                    <Input 
                      id="dose" 
                      placeholder="Ej: 1 tableta" 
                      value={newPrescription.dose}
                      onChange={e => setNewPrescription({...newPrescription, dose: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frecuencia *</Label>
                    <Input 
                      id="frequency" 
                      placeholder="Ej: Cada 12 horas" 
                      value={newPrescription.frequency}
                      onChange={e => setNewPrescription({...newPrescription, frequency: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración *</Label>
                  <Input 
                    id="duration" 
                    placeholder="Ej: 7 días" 
                    value={newPrescription.duration}
                    onChange={e => setNewPrescription({...newPrescription, duration: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Instrucciones especiales..." 
                    value={newPrescription.notes}
                    onChange={e => setNewPrescription({...newPrescription, notes: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddPrescriptionOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddPrescription}>Guardar Receta</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSOAPOpen} onOpenChange={setIsAddSOAPOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ClipboardType className="w-4 h-4" /> Nota SOAP
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass dark:glass-dark border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nota Clínica SOAP</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subjective">Subjective (S)</Label>
                  <Textarea 
                    id="subjective" 
                    placeholder="Motivo de consulta, síntomas reportados..." 
                    value={newSOAP.subjective}
                    onChange={e => setNewSOAP({...newSOAP, subjective: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objective">Objective (O)</Label>
                  <Textarea 
                    id="objective" 
                    placeholder="Examen físico, constantes vitales..." 
                    value={newSOAP.objective}
                    onChange={e => setNewSOAP({...newSOAP, objective: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessment">Assessment (A) *</Label>
                  <Textarea 
                    id="assessment" 
                    placeholder="Diagnóstico presuntivo o definitivo..." 
                    value={newSOAP.assessment}
                    onChange={e => setNewSOAP({...newSOAP, assessment: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan (P)</Label>
                  <Textarea 
                    id="plan" 
                    placeholder="Tratamiento, pruebas a realizar, seguimiento..." 
                    value={newSOAP.plan}
                    onChange={e => setNewSOAP({...newSOAP, plan: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddSOAPOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddSOAP}>Guardar Nota</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddAttachmentOpen} onOpenChange={setIsAddAttachmentOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-primary/10 hover:bg-primary/5">
                <Paperclip className="w-4 h-4" /> Nuevo Adjunto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass border-none shadow-2xl p-0 overflow-hidden rounded-[2rem]">
              <div className="p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black tracking-tight">Agregar Adjunto</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre del archivo *</Label>
                    <Input 
                      placeholder="Ej: Radiografía Tórax" 
                      className="rounded-xl bg-muted/30 border-border"
                      value={newAttachment.name}
                      onChange={e => setNewAttachment({...newAttachment, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.capture = 'environment';
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewAttachment({
                                ...newAttachment,
                                name: file.name,
                                type: 'image',
                                url: reader.result as string,
                                size: file.size
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Camera className="w-5 h-5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cámara</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,application/pdf';
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewAttachment({
                                ...newAttachment,
                                name: file.name,
                                type: file.type.startsWith('image/') ? 'image' : 'pdf',
                                url: reader.result as string,
                                size: file.size
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-5 h-5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Galería</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">O agregar por URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://..." 
                        className="rounded-xl bg-muted/30 border-border"
                        value={newAttachment.url?.startsWith('data:') ? '' : newAttachment.url}
                        onChange={e => setNewAttachment({...newAttachment, url: e.target.value, type: 'url'})}
                      />
                    </div>
                  </div>

                  {newAttachment.url && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-border bg-muted/30">
                      {newAttachment.type === 'image' || newAttachment.type === 'url' ? (
                        <img 
                          src={newAttachment.url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                          <FileText className="w-12 h-12 text-primary/40 mb-2" />
                          <span className="text-xs font-bold truncate w-full">{newAttachment.name}</span>
                        </div>
                      )}
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={() => setNewAttachment({...newAttachment, url: '', name: ''})}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <Button variant="ghost" onClick={() => setIsAddAttachmentOpen(false)} className="flex-1 h-12 rounded-xl font-bold">
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleAddAttachment} 
                      className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                      disabled={!newAttachment.url || !newAttachment.name}
                    >
                      Guardar Adjunto
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 shadow-sm">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Próxima Cita</p>
              <p className="text-xl font-black">
                {nextAppointment ? format(nextAppointment.date.toDate(), "d 'de' MMM", { locale: es }) : 'Sin turnos'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none rounded-3xl overflow-hidden bg-orange-500/5 border border-orange-500/10 shadow-sm">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/70 mb-1">Deuda Pendiente</p>
              <p className="text-xl font-black text-orange-600">${totalPending.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none rounded-3xl overflow-hidden bg-emerald-500/5 border border-emerald-500/10 shadow-sm">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-inner">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Último Pago</p>
              <p className="text-xl font-black text-emerald-600">
                {lastPayment ? `$${lastPayment.amount.toFixed(2)}` : 'Sin pagos'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Patient Info Card */}
        <div className="space-y-6">
          <Card className="border-none rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-primary/5 bg-primary/5">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Dog className="w-5 h-5 text-primary" /> Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Especie</p>
                  <p className="font-bold text-lg">{patient.species}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Raza</p>
                  <p className="font-bold text-lg">{patient.race || 'Sin raza'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sexo</p>
                  <p className="font-bold text-lg capitalize">{patient.sex?.replace('_', ' ') || 'No especificado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Esterilizado</p>
                  <p className="font-bold text-lg capitalize">{patient.isNeutered || 'No informado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Edad</p>
                  <p className="font-bold text-lg">{patient.age || 0} años</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peso</p>
                  <p className="font-bold text-lg">{patient.weight || 0} kg</p>
                </div>
              </div>

              <Separator className="bg-primary/5" />

              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" /> Información Clínica
                </p>
                <div className="space-y-3">
                  {patient.allergies && (
                    <div className="bg-red-500/5 p-3 rounded-2xl border border-red-500/10">
                      <p className="text-[8px] font-black uppercase tracking-widest text-red-500 mb-1">Alergias</p>
                      <p className="text-sm font-bold text-red-600">{patient.allergies}</p>
                    </div>
                  )}
                  {patient.medicalHistory && (
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-1">Antecedentes</p>
                      <p className="text-sm font-medium leading-relaxed">{patient.medicalHistory}</p>
                    </div>
                  )}
                  {patient.currentMedication && (
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-1">Medicación Actual</p>
                      <p className="text-sm font-medium leading-relaxed">{patient.currentMedication}</p>
                    </div>
                  )}
                  {patient.observations && (
                    <div className="bg-muted/30 p-3 rounded-2xl border border-border">
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Observaciones</p>
                      <p className="text-sm font-medium leading-relaxed">{patient.observations}</p>
                    </div>
                  )}
                  {!patient.allergies && !patient.medicalHistory && !patient.currentMedication && !patient.observations && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Sin información clínica registrada</p>
                  )}
                </div>
              </div>
              
              <Separator className="bg-primary/5" />
              
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Ubicación y Contacto
                </p>
                {patient.ownerAddress ? (
                  <div className="space-y-2">
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <p className="text-sm font-bold">{patient.ownerAddress}</p>
                      {patient.ownerNeighborhood && (
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{patient.ownerNeighborhood}</p>
                      )}
                    </div>
                    {patient.addressNotes && (
                      <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-2xl text-xs italic font-medium">
                        <Home className="w-4 h-4 shrink-0 text-primary/50" />
                        <span>{patient.addressNotes}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed text-center">
                    <p className="text-xs text-muted-foreground italic font-medium">Sin dirección registrada</p>
                  </div>
                )}
                {patient.emergencyContact && (
                  <div className="bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-orange-600 mb-1">Contacto de Emergencia</p>
                    <p className="text-sm font-bold">{patient.emergencyContact}</p>
                  </div>
                )}
              </div>

              <Separator className="bg-primary/5" />

              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Alertas de Vacunación</p>
                {overdueVaccines.length > 0 && (
                  <div className="flex items-center gap-3 text-xs font-bold text-destructive bg-destructive/5 p-3 rounded-2xl border border-destructive/10">
                    <AlertCircle className="w-4 h-4" />
                    <span>{overdueVaccines.length} vacunas vencidas</span>
                  </div>
                )}
                {nextVaccines.length > 0 && (
                  <div className="flex items-center gap-3 text-xs font-bold text-orange-600 bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10">
                    <Clock className="w-4 h-4" />
                    <span>{nextVaccines.length} vacunas próximas</span>
                  </div>
                )}
                {overdueVaccines.length === 0 && nextVaccines.length === 0 && (
                  <div className="p-4 rounded-2xl border border-dashed text-center">
                    <p className="text-xs text-muted-foreground font-medium">No hay alertas pendientes.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clinical History Timeline */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50 dark:bg-white/5 rounded-2xl border border-primary/5 glass dark:glass-dark">
              <TabsTrigger value="history" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Historial</TabsTrigger>
              <TabsTrigger value="soap" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">SOAP</TabsTrigger>
              <TabsTrigger value="prescriptions" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Recetas</TabsTrigger>
              <TabsTrigger value="vaccines" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Vacunas</TabsTrigger>
              <TabsTrigger value="attachments" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Adjuntos</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Facturas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="mt-8 space-y-8">
              <WeightChart history={history} />
              
              <div className="flex justify-end mb-4">
                {isMounted && patient && (history.length > 0 || soapNotes.length > 0) && (
                  <PDFDownloadLink
                    key={`history-${patient.id}-${history.length}-${soapNotes.length}-${clinic?.id || 'no-clinic'}`}
                    document={<MedicalRecordPDF patient={patient} history={history} soapNotes={soapNotes} clinic={clinic} />}
                    fileName={`historia-clinica-${(patient.name || 'paciente').replace(/\s+/g, '-')}-${format(new Date(), 'dd-MM-yyyy')}.pdf`}
                  >
                    {({ loading, error }) => (
                      <Button 
                        variant="outline" 
                        className={cn(
                          "gap-2 rounded-xl border-primary/20 hover:bg-primary/5",
                          error && "border-destructive text-destructive"
                        )}
                        disabled={loading}
                        onClick={(e) => {
                          if (error) {
                            e.preventDefault();
                            toast.error('Error al generar el PDF de historia clínica');
                            console.error('PDF Error:', error);
                          }
                        }}
                      >
                        <Download className="w-4 h-4" /> 
                        {loading ? 'Generando...' : 'Exportar Historia Clínica'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                )}
              </div>
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent">
                {history.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-primary/5 border-primary/10">
                    <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Calendar className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-bold">No hay eventos registrados en el historial.</p>
                  </div>
                ) : (
                  history.map((event, i) => (
                    <div key={event.id} className="relative flex items-start gap-8 pl-14 group">
                      <div className={cn(
                        "absolute left-0 w-10 h-10 rounded-2xl border-4 border-background flex items-center justify-center z-10 shadow-lg transition-transform group-hover:scale-110",
                        getEventColor(event.type)
                      )}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black uppercase tracking-widest text-primary">
                              {event.type === 'consultation' ? 'Consulta' : 
                               event.type === 'vaccine' ? 'Vacuna' : 
                               event.type === 'treatment' ? 'Tratamiento' : 'Nota'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                              {format(event.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                        <Card className="border-none rounded-2xl overflow-hidden shadow-lg">
                          <CardContent className="p-5">
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-foreground/80">{event.description}</p>
                            {event.nextDate && (
                              <div className="mt-4 pt-4 border-t border-primary/5 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary">
                                <Calendar className="w-4 h-4" />
                                Próxima cita: {format(event.nextDate.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="soap" className="mt-8">
              <div className="space-y-6">
                {soapNotes.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-primary/5 border-primary/10">
                    <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <ClipboardType className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-bold">No hay notas SOAP registradas.</p>
                  </div>
                ) : (
                  soapNotes.map((note) => (
                    <Card key={note.id} className="border-none rounded-3xl overflow-hidden shadow-lg">
                      <CardHeader className="pb-4 border-b border-primary/5 bg-primary/5">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <ClipboardType className="w-4 h-4" />
                            Nota SOAP
                          </CardTitle>
                          <Badge variant="secondary" className="rounded-lg font-bold bg-background dark:bg-white/10 shadow-sm border-none">
                            {format(note.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Subjective (S)</p>
                            <div className="bg-muted/30 dark:bg-white/5 p-4 rounded-2xl text-sm font-medium border border-primary/5">{note.subjective || 'N/A'}</div>
                          </div>
                          <div className="space-y-2">
                            <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Objective (O)</p>
                            <div className="bg-muted/30 dark:bg-white/5 p-4 rounded-2xl text-sm font-medium border border-primary/5">{note.objective || 'N/A'}</div>
                          </div>
                          <div className="space-y-2">
                            <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Assessment (A)</p>
                            <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-2xl text-sm font-bold border border-primary/10 text-primary">{note.assessment}</div>
                          </div>
                          <div className="space-y-2">
                            <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Plan (P)</p>
                            <div className="bg-muted/30 dark:bg-white/5 p-4 rounded-2xl text-sm font-medium border border-primary/5">{note.plan || 'N/A'}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-8">
              <div className="space-y-4">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-primary/5 border-primary/10">
                    <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Pill className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-bold">No hay recetas registradas.</p>
                  </div>
                ) : (
                  prescriptions.map((p) => (
                    <Card key={p.id} className="border-none rounded-3xl overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                              <Pill className="w-7 h-7" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black tracking-tight text-primary">{p.medication}</h4>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {format(p.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isMounted && (
                              <PDFDownloadLink
                                key={`prescription-${p.id}-${clinic?.id || 'no-clinic'}`}
                                document={<PrescriptionPDF prescription={p} patient={patient} clinic={clinic} vetName={profile?.displayName} />}
                                fileName={`receta-${(patient.name || 'paciente').replace(/\s+/g, '-')}-${format(p.date.toDate(), 'dd-MM-yyyy')}.pdf`}
                              >
                                {({ loading, error }) => (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className={cn(
                                      "gap-2 rounded-xl border-primary/10 hover:bg-primary/5",
                                      error && "border-destructive text-destructive"
                                    )}
                                    disabled={loading}
                                    onClick={(e) => {
                                      if (error) {
                                        e.preventDefault();
                                        toast.error('Error al generar el PDF de la receta');
                                        console.error('PDF Error:', error);
                                      }
                                    }}
                                  >
                                    <Download className="w-4 h-4" /> {loading ? '...' : 'PDF'}
                                  </Button>
                                )}
                              </PDFDownloadLink>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrescription(p.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/5">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Dosis</p>
                            <p className="font-bold text-primary">{p.dose}</p>
                          </div>
                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/5">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Frecuencia</p>
                            <p className="font-bold text-primary">{p.frequency}</p>
                          </div>
                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/5">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Duración</p>
                            <p className="font-bold text-primary">{p.duration}</p>
                          </div>
                        </div>
                        {p.notes && (
                          <div className="mt-4 p-4 bg-muted/30 rounded-2xl text-xs font-medium border border-primary/5 italic">
                            <p className="font-black not-italic mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Indicaciones Adicionales:</p>
                            {p.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="mt-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {attachments.length === 0 ? (
                  <div className="col-span-full text-center py-20 border-2 border-dashed rounded-3xl bg-primary/5 border-primary/10">
                    <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Paperclip className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-bold">No hay adjuntos registrados.</p>
                  </div>
                ) : (
                  attachments.map((att) => (
                    <Card key={att.id} className="border-none rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-500 bg-card border border-primary/5">
                      <CardContent className="p-0">
                        <div className="p-5">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                              att.type === 'image' || att.type === 'url' ? "bg-blue-500/10 text-blue-500" : 
                              att.type === 'pdf' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                            )}>
                              {att.type === 'image' || att.type === 'url' ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm truncate tracking-tight group-hover:text-primary transition-colors">{att.name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                {att.type} • {format(att.date.toDate(), 'dd MMM yyyy', { locale: es })}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5" asChild title="Ver">
                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, 'attachments', att.id));
                                    toast.success('Adjunto eliminado');
                                  } catch (e) {
                                    toast.error('Error al eliminar');
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {(att.type === 'image' || att.type === 'url') && (
                            <div className="aspect-video bg-muted rounded-2xl relative overflow-hidden border border-primary/5">
                              <img 
                                src={att.url} 
                                alt={att.name} 
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          
                          {att.type === 'pdf' && (
                            <div className="aspect-video bg-red-500/5 rounded-2xl flex flex-col items-center justify-center border border-red-500/10">
                              <FileText className="w-10 h-10 text-red-500/40 mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-500/60">Documento PDF</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="vaccines" className="mt-8">
              <div className="grid gap-4">
                {vaccines.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-primary/5 border-primary/10">
                    <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Syringe className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-bold">No hay vacunas registradas.</p>
                  </div>
                ) : (
                  vaccines.map((v) => (
                    <Card key={v.id} className="border-none rounded-2xl overflow-hidden">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center shadow-inner">
                            <Syringe className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black tracking-tight text-foreground">{v.description}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                              Aplicada el {format(v.date.toDate(), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        {v.nextDate && (
                          <div className="text-right">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Próxima dosis</p>
                            <Badge 
                              variant={isBefore(v.nextDate.toDate(), new Date()) ? 'destructive' : 'outline'}
                              className={cn(
                                "rounded-lg font-bold px-3 py-1",
                                !isBefore(v.nextDate.toDate(), new Date()) && "bg-primary/5 text-primary border-primary/10"
                              )}
                            >
                              {format(v.nextDate.toDate(), 'dd/MM/yyyy')}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="billing" className="mt-8">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <Card className="border-none rounded-3xl overflow-hidden bg-emerald-500/5 border-emerald-500/10">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-inner">
                        <CreditCard className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Total Pagado</p>
                        <p className="text-3xl font-black text-emerald-600">${totalPaid.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-none rounded-3xl overflow-hidden bg-orange-500/5 border-orange-500/10">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shadow-inner">
                        <Receipt className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/70 mb-1">Total Pendiente</p>
                        <p className="text-3xl font-black text-orange-600">${totalPending.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {charges.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-primary/5 border-primary/10">
                      <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <DollarSign className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground font-bold">No hay cargos registrados.</p>
                    </div>
                  ) : (
                    charges.map((charge) => (
                      <Card key={charge.id} className="border-none rounded-2xl overflow-hidden group hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                              charge.status === 'paid' ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                            )}>
                              <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black tracking-tight text-foreground">{charge.concept}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  {format(charge.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                                {charge.method && (
                                  <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                      {charge.method}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <p className="font-black text-2xl tracking-tighter">${charge.amount.toFixed(2)}</p>
                            <Badge 
                              variant={charge.status === 'paid' ? 'default' : 'outline'}
                              className={cn(
                                "cursor-pointer transition-all hover:scale-105 rounded-xl px-4 py-1.5 font-bold text-xs uppercase tracking-widest",
                                charge.status === 'paid' ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" : "text-orange-600 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
                              )}
                              onClick={() => toggleChargeStatus(charge)}
                            >
                              {charge.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailView;
