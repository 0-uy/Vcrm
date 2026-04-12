import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Home,
  MapPin
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
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils';
import { Appointment, Patient } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { handleFirestoreError, OperationType, logActivity } from '../lib/firestore-utils';

const AppointmentsView: React.FC = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    status: 'pending',
    date: Timestamp.fromDate(new Date()),
  });

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'appointments'),
      where('clinicId', '==', profile.clinicId),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    // Fetch patients for selection
    const fetchPatients = async () => {
      const qP = query(collection(db, 'patients'), where('clinicId', '==', profile.clinicId));
      const snap = await getDocs(qP);
      setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    };
    fetchPatients();

    return () => unsubscribe();
  }, [profile]);

  const handleAddAppointment = async () => {
    if (!profile || !newAppointment.patientId || !newAppointment.reason) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    const patient = patients.find(p => p.id === newAppointment.patientId);

    try {
      await addDoc(collection(db, 'appointments'), {
        ...newAppointment,
        patientName: patient?.name || 'Desconocido',
        clinicId: profile.clinicId,
      });

      // Add to global activity
      await logActivity({
        type: 'appointment',
        description: `Nuevo turno para ${patient?.name || 'Desconocido'}: ${newAppointment.reason}`,
        patientId: newAppointment.patientId,
        patientName: patient?.name || 'Desconocido',
        clinicId: profile.clinicId,
      });

      setIsAddDialogOpen(false);
      setNewAppointment({ status: 'pending', date: Timestamp.fromDate(new Date()) });
      toast.success('Turno programado correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    if (!profile) return;
    try {
      const app = appointments.find(a => a.id === id);
      await updateDoc(doc(db, 'appointments', id), { status });
      
      // Add to global activity
      await logActivity({
        type: 'appointment',
        description: `Turno de ${app?.patientName} marcado como ${status === 'attended' ? 'Atendido' : 'Cancelado'}`,
        patientId: app?.patientId,
        patientName: app?.patientName,
        clinicId: profile.clinicId,
      });

      toast.success('Estado actualizado.');
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar estado.');
    }
  };

  const filteredAppointments = appointments.filter(a => isSameDay(a.date.toDate(), selectedDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agenda de Turnos</h2>
          <p className="text-muted-foreground">Gestiona las citas y visitas del día.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Turno
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Programar Turno</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Paciente *</Label>
                <Select 
                  value={newAppointment.patientId} 
                  onValueChange={v => setNewAppointment({...newAppointment, patientId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.ownerName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => {
                      const date = new Date(e.target.value);
                      const current = newAppointment.date?.toDate() || new Date();
                      date.setHours(current.getHours(), current.getMinutes());
                      setNewAppointment({...newAppointment, date: Timestamp.fromDate(date)});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    defaultValue={format(new Date(), 'HH:mm')}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      const date = newAppointment.date?.toDate() || new Date();
                      date.setHours(h, m);
                      setNewAppointment({...newAppointment, date: Timestamp.fromDate(date)});
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo *</Label>
                <Input 
                  id="reason" 
                  placeholder="Ej: Vacunación, Control" 
                  value={newAppointment.reason || ''} 
                  onChange={e => setNewAppointment({...newAppointment, reason: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="homeVisit" 
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={newAppointment.isHomeVisit || false}
                  onChange={e => setNewAppointment({...newAppointment, isHomeVisit: e.target.checked})}
                />
                <Label htmlFor="homeVisit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Consulta a domicilio
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddAppointment}>Programar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="text-sm font-medium capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
            {isSameDay(selectedDate, new Date()) && (
              <p className="text-xs text-primary font-bold">HOY</p>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
          Ir a Hoy
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="py-20 text-center border rounded-lg border-dashed bg-muted/20">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">No hay turnos programados para este día.</p>
          </div>
        ) : (
          filteredAppointments.map((app) => (
            <Card key={app.id} className={cn(
              "overflow-hidden transition-all",
              app.status === 'attended' && "opacity-60 grayscale-[0.5]"
            )}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center p-5 gap-4">
                  <div className="flex items-center gap-4 md:w-32">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold">{format(app.date.toDate(), 'HH:mm')}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{app.patientName}</h3>
                      {app.isHomeVisit && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                          <Home className="w-3 h-3" /> Domicilio
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{app.reason}</p>
                    
                    {app.isHomeVisit && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                        <div>
                          {(() => {
                            const p = patients.find(p => p.id === app.patientId);
                            if (p?.ownerAddress) {
                              return (
                                <>
                                  <span className="font-medium text-foreground">{p.ownerAddress}</span>
                                  {p.ownerNeighborhood && <span> • {p.ownerNeighborhood}</span>}
                                  {p.addressNotes && <p className="italic mt-0.5">{p.addressNotes}</p>}
                                </>
                              );
                            }
                            return <span className="italic">Sin dirección registrada</span>;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={app.status === 'pending' ? 'outline' : app.status === 'attended' ? 'default' : 'destructive'}>
                      {app.status === 'pending' ? 'Pendiente' : app.status === 'attended' ? 'Atendido' : 'Cancelado'}
                    </Badge>
                    
                    {app.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-500 hover:text-green-600 hover:bg-green-50"
                          onClick={() => updateStatus(app.id, 'attended')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Atender
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatus(app.id, 'cancelled')}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentsView;
