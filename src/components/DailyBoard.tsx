import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  MoreHorizontal, 
  User, 
  Calendar as CalendarIcon,
  Home,
  MapPin,
  ArrowRightLeft
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { Appointment, AppointmentStatus, Patient } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType, logActivity } from '../lib/firestore-utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const DailyBoard: React.FC = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      collection(db, 'appointments'),
      where('clinicId', '==', profile.clinicId),
      where('date', '>=', Timestamp.fromDate(today)),
      where('date', '<', Timestamp.fromDate(tomorrow))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    const qPatients = query(collection(db, 'patients'), where('clinicId', '==', profile.clinicId));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    return () => {
      unsubscribe();
      unsubPatients();
    };
  }, [profile]);

  const getPatientName = (app: Appointment) => {
    if (app.patientName && app.patientName !== app.patientId) return app.patientName;
    const p = patients.find(p => p.id === app.patientId);
    return p?.name || 'Paciente Desconocido';
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      toast.success(`Estado actualizado a ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const columns: { id: AppointmentStatus; title: string; icon: any; color: string }[] = [
    { id: 'pending', title: 'Pendiente', icon: Clock, color: 'text-orange-500 bg-orange-500/10' },
    { id: 'in-consultation', title: 'En Consulta', icon: Play, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'attended', title: 'Atendido', icon: CheckCircle2, color: 'text-green-500 bg-green-500/10' },
  ];

  const getColumnAppointments = (status: AppointmentStatus) => {
    return appointments.filter(a => a.status === status);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Flow del Día
          </h2>
          <p className="text-muted-foreground font-medium">Gestión operativa de pacientes para hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted/50 px-4 py-2 rounded-2xl border border-border flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Hoy</span>
            <Badge className="bg-primary text-primary-foreground rounded-lg font-black shadow-lg shadow-primary/20">
              {appointments.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[600px]">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col gap-6 bg-muted/30 rounded-[2.5rem] p-6 border border-border shadow-inner">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-2xl shadow-lg transition-transform hover:scale-110", column.color)}>
                  <column.icon className="w-5 h-5" />
                </div>
                <h3 className="font-black tracking-tight text-xl">{column.title}</h3>
              </div>
              <Badge variant="secondary" className="rounded-xl font-black bg-background dark:bg-white/10 shadow-sm border-none px-3 py-1 text-xs">
                {getColumnAppointments(column.id).length}
              </Badge>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {getColumnAppointments(column.id).map((apt) => (
                  <motion.div
                    key={apt.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Card className="border border-border rounded-3xl group hover:shadow-2xl transition-all duration-500 cursor-grab active:cursor-grabbing overflow-hidden hover:-translate-y-1">
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-lg font-black shadow-inner group-hover:scale-110 transition-transform">
                              {getPatientName(apt).charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-base tracking-tight leading-tight">{getPatientName(apt)}</p>
                              <p className="text-[10px] font-black text-muted-foreground flex items-center gap-1.5 uppercase tracking-widest mt-1">
                                <Clock className="w-3.5 h-3.5 text-primary/70" />
                                {format(apt.date.toDate(), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl border border-border shadow-2xl bg-popover p-2 min-w-[180px]">
                              {column.id !== 'pending' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'pending')} className="rounded-xl gap-3 py-2.5 font-bold">
                                  <Clock className="w-4 h-4 text-orange-500" /> Mover a Pendiente
                                </DropdownMenuItem>
                              )}
                              {column.id !== 'in-consultation' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'in-consultation')} className="rounded-xl gap-3 py-2.5 font-bold">
                                  <Play className="w-4 h-4 text-blue-500" /> Mover a En Consulta
                                </DropdownMenuItem>
                              )}
                              {column.id !== 'attended' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'attended')} className="rounded-xl gap-3 py-2.5 font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mover a Atendido
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="text-xs font-bold text-muted-foreground leading-relaxed bg-muted/30 dark:bg-white/5 p-4 rounded-2xl italic border border-primary/5 group-hover:bg-primary/5 transition-colors">
                          "{apt.reason}"
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                          {apt.isHomeVisit ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-500/20 bg-orange-500/5 gap-2 py-1.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest">
                              <Home className="w-3.5 h-3.5" /> Domicilio
                            </Badge>
                          ) : (
                            <span className="text-[10px] font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest opacity-70">
                              <MapPin className="w-3.5 h-3.5 text-primary/50" /> Clínica
                            </span>
                          )}
                          
                          <div className="flex gap-2">
                            {column.id === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 px-4 rounded-xl text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/10 transition-all"
                                onClick={() => updateStatus(apt.id, 'in-consultation')}
                              >
                                <Play className="w-3.5 h-3.5 mr-2" /> Iniciar
                              </Button>
                            )}
                            {column.id === 'in-consultation' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 px-4 rounded-xl text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/10 transition-all"
                                onClick={() => updateStatus(apt.id, 'attended')}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Finalizar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {getColumnAppointments(column.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/20 animate-in fade-in zoom-in duration-700">
                  <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-muted-foreground/10 flex items-center justify-center mb-4">
                    <User className="w-8 h-8 opacity-30" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin pacientes</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyBoard;
