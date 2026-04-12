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
import { Appointment, AppointmentStatus } from '../types';
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
import { handleFirestoreError, OperationType, logActivity } from '../lib/firestore-utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const DailyBoard: React.FC = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
      where('date', '<', Timestamp.fromDate(tomorrow)),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    return () => unsubscribe();
  }, [profile]);

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
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Flow del Día</h2>
          <p className="text-muted-foreground font-medium">Gestión operativa de pacientes para hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Hoy</span>
            <Badge className="bg-primary text-primary-foreground rounded-lg font-bold">
              {appointments.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[600px]">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col gap-6 bg-primary/5 rounded-[2rem] p-6 border border-primary/5 glass">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shadow-sm ${column.color}`}>
                  <column.icon className="w-5 h-5" />
                </div>
                <h3 className="font-black tracking-tight text-lg">{column.title}</h3>
              </div>
              <Badge variant="secondary" className="rounded-lg font-bold bg-background shadow-sm border-none">
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
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Card className="glass-card border-none rounded-2xl group hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-black shadow-inner">
                              {apt.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-sm tracking-tight">{apt.patientName}</p>
                              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
                                <Clock className="w-3 h-3" />
                                {format(apt.date.toDate(), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl glass">
                              {column.id !== 'pending' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'pending')} className="rounded-lg gap-2">
                                  <Clock className="w-4 h-4" /> Mover a Pendiente
                                </DropdownMenuItem>
                              )}
                              {column.id !== 'in-consultation' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'in-consultation')} className="rounded-lg gap-2">
                                  <Play className="w-4 h-4" /> Mover a En Consulta
                                </DropdownMenuItem>
                              )}
                              {column.id !== 'attended' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'attended')} className="rounded-lg gap-2">
                                  <CheckCircle2 className="w-4 h-4" /> Mover a Atendido
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="text-xs font-medium text-muted-foreground line-clamp-2 bg-muted/30 p-3 rounded-xl italic border border-primary/5">
                          "{apt.reason}"
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                          {apt.isHomeVisit ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-500/20 bg-orange-500/5 gap-1.5 py-1 px-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest">
                              <Home className="w-3 h-3" /> Domicilio
                            </Badge>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-widest">
                              <MapPin className="w-3 h-3 text-primary/50" /> Clínica
                            </span>
                          )}
                          
                          <div className="flex gap-2">
                            {column.id === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 px-3 rounded-lg text-blue-600 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-500/10"
                                onClick={() => updateStatus(apt.id, 'in-consultation')}
                              >
                                <Play className="w-3 h-3 mr-1.5" /> Iniciar
                              </Button>
                            )}
                            {column.id === 'in-consultation' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 px-3 rounded-lg text-green-600 font-bold text-[10px] uppercase tracking-widest hover:bg-green-500/10"
                                onClick={() => updateStatus(apt.id, 'attended')}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1.5" /> Finalizar
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
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center mb-3">
                    <User className="w-6 h-6" />
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
