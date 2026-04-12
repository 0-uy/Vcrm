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
  MoreHorizontal
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
import { Patient, ClinicalEvent, ClinicalEventType } from '../types';
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
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<ClinicalEvent>>({
    type: 'consultation',
    date: Timestamp.now(),
  });

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

    return () => unsubscribe();
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Historial Clínico</TabsTrigger>
              <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
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
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailView;
