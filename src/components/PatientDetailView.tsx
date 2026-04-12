import React, { useState, useEffect } from 'react';
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
  Download
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
import { Patient, ClinicalEvent, ClinicalEventType, Charge, ChargeStatus, Prescription, SOAPNote, Attachment } from '../types';
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

import { handleFirestoreError, OperationType, logActivity } from '../lib/firestore-utils';

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({ patient, onBack }) => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<ClinicalEvent[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
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
  });
  const [newCharge, setNewCharge] = useState<Partial<Charge>>({
    concept: 'Consulta',
    amount: 0,
    status: 'pending',
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
    setEditPatient(patient);
  }, [patient]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'patients', patient.id, 'history'),
      orderBy('date', 'desc')
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
      orderBy('date', 'desc')
    );

    const unsubscribeCharges = onSnapshot(qCharges, (snapshot) => {
      setCharges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charge)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'charges');
    });

    // Fetch prescriptions
    const qPrescriptions = query(
      collection(db, 'prescriptions'),
      where('patientId', '==', patient.id),
      orderBy('date', 'desc')
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
      orderBy('date', 'desc')
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
      orderBy('date', 'desc')
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
      });

      // 2. Update patient metadata
      const patientUpdate: any = {
        lastVisitAt: newEvent.date || Timestamp.now()
      };
      if (newEvent.type === 'vaccine' && newEvent.nextDate) {
        patientUpdate.nextVaccineDate = newEvent.nextDate;
        
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

  const handleUpdatePatient = async () => {
    if (!profile || !editPatient.name || !editPatient.ownerName) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        ...editPatient,
        updatedAt: Timestamp.now(),
      });

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
      setNewCharge({ concept: 'Consulta', amount: 0, status: 'pending', date: Timestamp.now() });
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

      await logActivity({
        type: 'treatment',
        description: `Nueva receta para ${patient.name}: ${newPrescription.medication}`,
        patientId: patient.id,
        patientName: patient.name,
        clinicId: profile.clinicId,
      });

      setIsAddPrescriptionOpen(false);
      setNewPrescription({ medication: '', dose: '', frequency: '', duration: '', date: Timestamp.now() });
      toast.success('Receta agregada correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prescriptions');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{patient.name}</h2>
          <p className="text-muted-foreground">Dueño: {patient.ownerName} • {patient.ownerPhone}</p>
        </div>
        
        <div className="ml-auto flex gap-2">
          <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit2 className="w-4 h-4" /> Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Paciente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nombre Mascota *</Label>
                    <Input 
                      id="edit-name" 
                      value={editPatient.name || ''} 
                      onChange={e => setEditPatient({...editPatient, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-species">Especie *</Label>
                    <Select 
                      value={editPatient.species} 
                      onValueChange={v => setEditPatient({...editPatient, species: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Perro">Perro</SelectItem>
                        <SelectItem value="Gato">Gato</SelectItem>
                        <SelectItem value="Ave">Ave</SelectItem>
                        <SelectItem value="Conejo">Conejo</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-race">Raza</Label>
                    <Input 
                      id="edit-race" 
                      value={editPatient.race || ''} 
                      onChange={e => setEditPatient({...editPatient, race: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-age">Edad (años)</Label>
                    <Input 
                      id="edit-age" 
                      type="number" 
                      value={editPatient.age || ''} 
                      onChange={e => setEditPatient({...editPatient, age: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Peso (kg)</Label>
                  <Input 
                    id="edit-weight" 
                    type="number" 
                    value={editPatient.weight || ''} 
                    onChange={e => setEditPatient({...editPatient, weight: Number(e.target.value)})}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="edit-ownerName">Nombre del Dueño *</Label>
                  <Input 
                    id="edit-ownerName" 
                    value={editPatient.ownerName || ''} 
                    onChange={e => setEditPatient({...editPatient, ownerName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ownerPhone">Teléfono</Label>
                  <Input 
                    id="edit-ownerPhone" 
                    value={editPatient.ownerPhone || ''} 
                    onChange={e => setEditPatient({...editPatient, ownerPhone: e.target.value})}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="edit-ownerAddress">Dirección</Label>
                  <Input 
                    id="edit-ownerAddress" 
                    value={editPatient.ownerAddress || ''} 
                    onChange={e => setEditPatient({...editPatient, ownerAddress: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-ownerNeighborhood">Barrio / Localidad</Label>
                    <Input 
                      id="edit-ownerNeighborhood" 
                      value={editPatient.ownerNeighborhood || ''} 
                      onChange={e => setEditPatient({...editPatient, ownerNeighborhood: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-addressNotes">Notas de Dirección</Label>
                    <Input 
                      id="edit-addressNotes" 
                      value={editPatient.addressNotes || ''} 
                      onChange={e => setEditPatient({...editPatient, addressNotes: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditPatientOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdatePatient}>Guardar Cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Agregar Evento Clínico</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Evento</Label>
                    <Select 
                      value={newEvent.type} 
                      onValueChange={v => setNewEvent({...newEvent, type: v as ClinicalEventType})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consulta</SelectItem>
                        <SelectItem value="vaccine">Vacuna</SelectItem>
                        <SelectItem value="treatment">Tratamiento</SelectItem>
                        <SelectItem value="note">Nota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => setNewEvent({...newEvent, date: Timestamp.fromDate(new Date(e.target.value))})}
                    />
                  </div>
                </div>
                
                {newEvent.type === 'vaccine' && (
                  <div className="space-y-2">
                    <Label htmlFor="nextDate">Próxima Dosis (Opcional)</Label>
                    <Input 
                      id="nextDate" 
                      type="date" 
                      onChange={e => setNewEvent({...newEvent, nextDate: Timestamp.fromDate(new Date(e.target.value))})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción / Notas</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Detalles de la consulta, vacuna aplicada, etc." 
                    className="min-h-[100px]"
                    value={newEvent.description || ''}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddEvent}>Guardar Evento</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                <DollarSign className="w-4 h-4" /> Nuevo Cargo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Registrar Cargo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="concept">Concepto *</Label>
                  <Select 
                    value={newCharge.concept} 
                    onValueChange={v => setNewCharge({...newCharge, concept: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar concepto" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="amount">Monto ($) *</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={newCharge.amount || ''} 
                    onChange={e => setNewCharge({...newCharge, amount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select 
                    value={newCharge.status} 
                    onValueChange={v => setNewCharge({...newCharge, status: v as ChargeStatus})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado del pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddChargeOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddCharge}>Registrar</Button>
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
            <DialogContent className="sm:max-w-[500px]">
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              <Button variant="outline" className="gap-2">
                <Paperclip className="w-4 h-4" /> Adjunto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Agregar Adjunto</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="att-name">Nombre del archivo *</Label>
                  <Input 
                    id="att-name" 
                    placeholder="Ej: Radiografía Tórax" 
                    value={newAttachment.name}
                    onChange={e => setNewAttachment({...newAttachment, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="att-type">Tipo</Label>
                  <Select 
                    value={newAttachment.type} 
                    onValueChange={v => setNewAttachment({...newAttachment, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagen / Foto</SelectItem>
                      <SelectItem value="pdf">Análisis (PDF)</SelectItem>
                      <SelectItem value="study">Estudio / Informe</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="att-url">URL del archivo *</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="att-url" 
                      placeholder="https://..." 
                      value={newAttachment.url}
                      onChange={e => setNewAttachment({...newAttachment, url: e.target.value})}
                    />
                    <Button variant="secondary" size="icon" type="button">
                      <FileUp className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Nota: En esta demo, ingresa una URL directa al archivo.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAttachmentOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddAttachment}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patient Info Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Especie</p>
                  <p className="font-medium">{patient.species}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Raza</p>
                  <p className="font-medium">{patient.race || 'Sin raza'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Edad</p>
                  <p className="font-medium">{patient.age || 0} años</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso</p>
                  <p className="font-medium">{patient.weight || 0} kg</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Ubicación del Dueño
                </p>
                {patient.ownerAddress ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{patient.ownerAddress}</p>
                    {patient.ownerNeighborhood && (
                      <p className="text-xs text-muted-foreground">{patient.ownerNeighborhood}</p>
                    )}
                    {patient.addressNotes && (
                      <div className="flex items-start gap-2 mt-1 p-2 bg-muted/50 rounded text-xs italic">
                        <Home className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{patient.addressNotes}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin dirección registrada</p>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Alertas de Vacunación</p>
                {overdueVaccines.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">
                    <AlertCircle className="w-3 h-3" />
                    <span>{overdueVaccines.length} vacunas vencidas</span>
                  </div>
                )}
                {nextVaccines.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-orange-500 bg-orange-500/10 p-2 rounded-md border border-orange-500/20">
                    <Clock className="w-3 h-3" />
                    <span>{nextVaccines.length} vacunas próximas</span>
                  </div>
                )}
                {overdueVaccines.length === 0 && nextVaccines.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay alertas pendientes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clinical History Timeline */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="history">Historial</TabsTrigger>
              <TabsTrigger value="soap">SOAP</TabsTrigger>
              <TabsTrigger value="prescriptions">Recetas</TabsTrigger>
              <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
              <TabsTrigger value="attachments">Adjuntos</TabsTrigger>
              <TabsTrigger value="billing">Facturas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="mt-6">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {history.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">No hay eventos registrados.</p>
                  </div>
                ) : (
                  history.map((event, i) => (
                    <div key={event.id} className="relative flex items-start gap-6 pl-12">
                      <div className={cn(
                        "absolute left-0 w-10 h-10 rounded-full border-4 border-background flex items-center justify-center z-10",
                        getEventColor(event.type)
                      )}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold capitalize">
                              {event.type === 'consultation' ? 'Consulta' : 
                               event.type === 'vaccine' ? 'Vacuna' : 
                               event.type === 'treatment' ? 'Tratamiento' : 'Nota'}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {format(event.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                            {event.nextDate && (
                              <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs font-medium text-primary">
                                <Calendar className="w-3 h-3" />
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

            <TabsContent value="soap" className="mt-6">
              <div className="space-y-6">
                {soapNotes.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">No hay notas SOAP registradas.</p>
                  </div>
                ) : (
                  soapNotes.map((note) => (
                    <Card key={note.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <ClipboardType className="w-4 h-4 text-primary" />
                            Nota SOAP
                          </CardTitle>
                          <Badge variant="secondary" className="text-[10px]">
                            {format(note.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="font-bold text-xs text-muted-foreground uppercase">Subjective (S)</p>
                            <p className="bg-muted/30 p-2 rounded">{note.subjective || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-xs text-muted-foreground uppercase">Objective (O)</p>
                            <p className="bg-muted/30 p-2 rounded">{note.objective || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-xs text-muted-foreground uppercase">Assessment (A)</p>
                            <p className="bg-primary/5 p-2 rounded font-medium border border-primary/10">{note.assessment}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-xs text-muted-foreground uppercase">Plan (P)</p>
                            <p className="bg-muted/30 p-2 rounded">{note.plan || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-6">
              <div className="space-y-4">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">No hay recetas registradas.</p>
                  </div>
                ) : (
                  prescriptions.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Pill className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold">{p.medication}</h4>
                              <p className="text-xs text-muted-foreground">
                                {format(p.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-3 h-3" /> PDF
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-muted/50 p-2 rounded">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Dosis</p>
                            <p className="font-medium">{p.dose}</p>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Frecuencia</p>
                            <p className="font-medium">{p.frequency}</p>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Duración</p>
                            <p className="font-medium">{p.duration}</p>
                          </div>
                        </div>
                        {p.notes && (
                          <div className="mt-3 p-2 bg-primary/5 rounded text-xs italic border border-primary/10">
                            <p className="font-bold not-italic mb-1">Indicaciones:</p>
                            {p.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {attachments.length === 0 ? (
                  <div className="col-span-full text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">No hay adjuntos registrados.</p>
                  </div>
                ) : (
                  attachments.map((att) => (
                    <Card key={att.id} className="overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="flex items-center p-4 gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                            att.type === 'image' ? "bg-blue-500/10 text-blue-500" : 
                            att.type === 'pdf' ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                          )}>
                            {att.type === 'image' ? <FileUp className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{att.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              {att.type} • {format(att.date.toDate(), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                        {att.type === 'image' && (
                          <div className="h-32 bg-muted relative overflow-hidden border-t">
                            <img 
                              src={att.url} 
                              alt={att.name} 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="vaccines" className="mt-6">
              <div className="grid gap-4">
                {vaccines.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">No hay vacunas registradas.</p>
                  </div>
                ) : (
                  vaccines.map((v) => (
                    <Card key={v.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                            <Syringe className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold">{v.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Aplicada el {format(v.date.toDate(), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        {v.nextDate && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Próxima dosis</p>
                            <Badge variant={isBefore(v.nextDate.toDate(), new Date()) ? 'destructive' : 'outline'}>
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

            <TabsContent value="billing" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-green-500/5 border-green-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Pagado</p>
                        <p className="text-xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Pendiente</p>
                        <p className="text-xl font-bold text-orange-600">${totalPending.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {charges.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg border-dashed">
                      <p className="text-muted-foreground">No hay cargos registrados.</p>
                    </div>
                  ) : (
                    charges.map((charge) => (
                      <Card key={charge.id} className="overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              charge.status === 'paid' ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                            )}>
                              <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold">{charge.concept}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(charge.date.toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <p className="font-bold text-lg">${charge.amount.toFixed(2)}</p>
                            <Badge 
                              variant={charge.status === 'paid' ? 'default' : 'outline'}
                              className={cn(
                                "cursor-pointer transition-all hover:scale-105",
                                charge.status === 'paid' ? "bg-green-500 hover:bg-green-600" : "text-orange-500 border-orange-500 hover:bg-orange-50"
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
