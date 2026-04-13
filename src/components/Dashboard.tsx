import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Activity,
  AlertTriangle,
  Stethoscope,
  Syringe
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { Patient, Appointment, ActivityEvent, InventoryItem, Charge } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { format, isAfter, isBefore, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);

  useEffect(() => {
    if (!profile) return;

    const clinicId = profile.clinicId;

    // Fetch Patients
    const qPatients = query(collection(db, 'patients'), where('clinicId', '==', clinicId));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    });

    // Fetch Today's Appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const qAppointments = query(
      collection(db, 'appointments'), 
      where('clinicId', '==', clinicId),
      where('date', '>=', Timestamp.fromDate(today)),
      orderBy('date', 'asc')
    );
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    // Fetch Recent Activity
    const qActivity = query(
      collection(db, 'activity'),
      where('clinicId', '==', clinicId),
      orderBy('date', 'desc'),
      limit(10)
    );
    const unsubActivity = onSnapshot(qActivity, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityEvent)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activity');
    });

    // Fetch Inventory for Alerts
    const qInventory = query(collection(db, 'inventory'), where('clinicId', '==', clinicId));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    // Fetch Charges
    const qCharges = query(collection(db, 'charges'), where('clinicId', '==', clinicId));
    const unsubCharges = onSnapshot(qCharges, (snapshot) => {
      setCharges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charge)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'charges');
    });

    return () => {
      unsubPatients();
      unsubAppointments();
      unsubActivity();
      unsubInventory();
      unsubCharges();
    };
  }, [profile]);

  const lowStockItems = inventory.filter(item => item.stock <= item.minStock);
  const overdueVaccines = patients.filter(p => p.nextVaccineDate && isBefore(p.nextVaccineDate.toDate(), new Date()));
  const threeMonthsAgo = subMonths(new Date(), 3);
  const inactivePatients = patients.filter(p => !p.lastVisitAt || isBefore(p.lastVisitAt.toDate(), threeMonthsAgo));

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyIncome = charges
    .filter(c => c.status === 'paid' && c.date.toDate().getMonth() === currentMonth && c.date.toDate().getFullYear() === currentYear)
    .reduce((sum, c) => sum + c.amount, 0);
  const totalPending = charges
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  const stats = [
    { label: 'Total Pacientes', value: patients.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Turnos Hoy', value: appointments.filter(a => a.status === 'pending').length, icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Ingresos Mes', value: `$${monthlyIncome.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pendiente Cobro', value: `$${totalPending.toLocaleString()}`, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Hola, {profile?.displayName?.split(' ')[0] || 'Doctor'}
          </h2>
          <p className="text-muted-foreground font-medium">
            Resumen operativo para <span className="text-foreground font-bold">{profile?.clinicName || 'tu clínica'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Estado de Cuenta</span>
            <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-3">
              Suscripción Activa
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none overflow-hidden relative group transition-all duration-500 hover:-translate-y-1">
            <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110", stat.bg)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {stat.label === 'Total Pacientes' ? 'Base de datos activa' : 
                 stat.value !== '$0' && stat.value !== 0 ? 'Actualizado hace un momento' : 'Sin actividad reciente'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity Feed */}
        <Card className="col-span-4 border-none shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-primary/5 pb-4">
            <div>
              <CardTitle className="text-xl font-bold">Actividad Reciente</CardTitle>
              <CardDescription>Eventos clínicos y administrativos en tiempo real.</CardDescription>
            </div>
            <div className="p-2 bg-primary/5 rounded-full">
              <Activity className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-8">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Activity className="w-8 h-8" />
                    </div>
                    <p className="font-medium">No hay actividad registrada aún.</p>
                  </div>
                ) : (
                  activities.map((activity, i) => (
                    <div key={activity.id} className="flex gap-4 relative">
                      {i !== activities.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-gradient-to-b from-primary/20 to-transparent" />
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm",
                        activity.type === 'consultation' ? "bg-blue-500 text-white" :
                        activity.type === 'vaccine' ? "bg-emerald-500 text-white" :
                        activity.type === 'appointment' ? "bg-indigo-500 text-white" :
                        "bg-orange-500 text-white"
                      )}>
                        {activity.type === 'consultation' ? <Stethoscope className="w-4 h-4" /> :
                         activity.type === 'vaccine' ? <Syringe className="w-4 h-4" /> :
                         activity.type === 'appointment' ? <Calendar className="w-4 h-4" /> :
                         activity.type === 'billing' ? <TrendingUp className="w-4 h-4" /> :
                         <Package className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground leading-none">
                            {activity.description}
                          </p>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {format(activity.date.toDate(), "HH:mm 'hs'", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                          <span className="text-primary/70">{activity.userName}</span>
                          <span>•</span>
                          <span className="capitalize">{format(activity.date.toDate(), "d 'de' MMMM", { locale: es })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Alerts & Today's Appointments */}
        <div className="col-span-3 space-y-6">
          {/* Critical Alerts */}
          {(lowStockItems.length > 0 || overdueVaccines.length > 0 || inactivePatients.length > 0) && (
            <Card className="border-none bg-destructive/5 dark:bg-destructive/10 shadow-inner">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black flex items-center gap-2 text-destructive uppercase tracking-widest">
                  <AlertTriangle className="w-4 h-4" /> Alertas Críticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockItems.length > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-destructive/80">Stock bajo en inventario</span>
                    <Badge variant="destructive" className="h-5 px-2 rounded-full">{lowStockItems.length}</Badge>
                  </div>
                )}
                {overdueVaccines.length > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-destructive/80">Vacunas vencidas</span>
                    <Badge variant="destructive" className="h-5 px-2 rounded-full">{overdueVaccines.length}</Badge>
                  </div>
                )}
                {inactivePatients.length > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Pacientes inactivos</span>
                    <Badge variant="outline" className="h-5 px-2 rounded-full border-muted-foreground/20">{inactivePatients.length}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-xl">
            <CardHeader className="border-b border-primary/5 pb-4">
              <CardTitle className="text-xl font-bold">Agenda de Hoy</CardTitle>
              <CardDescription>
                {appointments.length} citas programadas para hoy.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-20">
                      <Calendar className="h-10 w-10 mb-3" />
                      <p className="text-sm font-bold">Sin turnos hoy.</p>
                    </div>
                  ) : (
                    appointments.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-4 rounded-2xl border bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-sm">
                            {app.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{app.patientName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                {format(app.date.toDate(), 'HH:mm')} • {app.reason}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={app.status === 'pending' ? 'outline' : 'default'} 
                          className={cn(
                            "text-[10px] font-bold uppercase px-2 h-6 rounded-full",
                            app.status === 'pending' ? "border-primary/20 text-primary bg-primary/5" : "bg-emerald-500"
                          )}
                        >
                          {app.status === 'pending' ? 'Pendiente' : 'Atendido'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
