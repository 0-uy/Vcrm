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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Flow del Día</h2>
          <p className="text-muted-foreground">Gestión operativa de pacientes para hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Total Hoy: {appointments.length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col gap-4 bg-muted/30 rounded-xl p-4 border border-dashed">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${column.color}`}>
                  <column.icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold">{column.title}</h3>
              </div>
              <Badge variant="secondary">{getColumnAppointments(column.id).length}</Badge>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {getColumnAppointments(column.id).map((apt) => (
                  <motion.div
                    key={apt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {apt.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{apt.patientName}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(apt.date.toDate(), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {column.id !== 'pending' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'pending')}>
                                  Mover a Pendiente
                                </DropdownMenuItem>
                              )}
                              {column.id !== 'in-consultation' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'in-consultation')}>
                                  Mover a En Consulta
                                </DropdownMenuItem>
                              )}
                              {column.id !== 'attended' && (
                                <DropdownMenuItem onClick={() => updateStatus(apt.id, 'attended')}>
                                  Mover a Atendido
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded italic">
                          "{apt.reason}"
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t text-[10px]">
                          {apt.isHomeVisit ? (
                            <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5 gap-1 py-0">
                              <Home className="w-3 h-3" /> Domicilio
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Clínica
                            </span>
                          )}
                          
                          <div className="flex gap-1">
                            {column.id === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => updateStatus(apt.id, 'in-consultation')}
                              >
                                <Play className="w-3 h-3 mr-1" /> Iniciar
                              </Button>
                            )}
                            {column.id === 'in-consultation' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-green-500 hover:text-green-600 hover:bg-green-50"
                                onClick={() => updateStatus(apt.id, 'attended')}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Finalizar
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
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                  <p className="text-xs italic">Sin pacientes</p>
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
