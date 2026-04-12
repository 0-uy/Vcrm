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
  AlertTriangle
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
    { label: 'Total Pacientes', value: patients.length, icon: Users, color: 'text-blue-500' },
    { label: 'Turnos Hoy', value: appointments.filter(a => a.status === 'pending').length, icon: Calendar, color: 'text-green-500' },
    { label: 'Ingresos Mes', value: `$${monthlyIncome.toFixed(0)}`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Pendiente Cobro', value: `$${totalPending.toFixed(0)}`, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  // Mock data for the chart
  const chartData = [
    { name: 'Lun', visitas: 4 },
    { name: 'Mar', visitas: 7 },
    { name: 'Mie', visitas: 5 },
    { name: 'Jue', visitas: 8 },
    { name: 'Vie', visitas: 12 },
    { name: 'Sab', visitas: 9 },
    { name: 'Dom', visitas: 2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bienvenido, {profile?.displayName || 'Doctor'}</h2>
          <p className="text-muted-foreground">Resumen de actividad para {profile?.clinicName || 'tu clínica'}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Clinic ID: {profile?.clinicId}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className={cn(stat.value > 0 && stat.label !== 'Total Pacientes' && "border-primary/20 bg-primary/5")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.label === 'Total Pacientes' ? 'Crecimiento constante' : 
                 stat.value > 0 ? 'Requiere atención' : 'Todo al día'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity Feed */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimos eventos registrados en la clínica.</CardDescription>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                    <Activity className="w-12 h-12 mb-4" />
                    <p>No hay actividad registrada aún.</p>
                  </div>
                ) : (
                  activities.map((activity, i) => (
                    <div key={activity.id} className="flex gap-4 relative pb-6 last:pb-0">
                      {i !== activities.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                        activity.type === 'consultation' ? "bg-blue-500/10 text-blue-500" :
                        activity.type === 'vaccine' ? "bg-green-500/10 text-green-500" :
                        activity.type === 'appointment' ? "bg-purple-500/10 text-purple-500" :
                        "bg-orange-500/10 text-orange-500"
                      )}>
                        {activity.type === 'consultation' ? <Clock className="w-4 h-4" /> :
                         activity.type === 'vaccine' ? <AlertCircle className="w-4 h-4" /> :
                         activity.type === 'appointment' ? <Calendar className="w-4 h-4" /> :
                         activity.type === 'billing' ? <TrendingUp className="w-4 h-4" /> :
                         <Package className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{activity.userName}</span>
                          <span>•</span>
                          <span>{format(activity.date.toDate(), "HH:mm 'hs'", { locale: es })}</span>
                          <span>•</span>
                          <span className="capitalize">{format(activity.date.toDate(), "d 'de' MMM", { locale: es })}</span>
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
        <div className="col-span-3 space-y-4">
          {/* Critical Alerts */}
          {(lowStockItems.length > 0 || overdueVaccines.length > 0 || inactivePatients.length > 0) && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" /> Alertas Críticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Productos con stock bajo</span>
                    <Badge variant="destructive" className="h-5">{lowStockItems.length}</Badge>
                  </div>
                )}
                {overdueVaccines.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pacientes con vacunas vencidas</span>
                    <Badge variant="destructive" className="h-5">{overdueVaccines.length}</Badge>
                  </div>
                )}
                {inactivePatients.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pacientes inactivos (+3 meses)</span>
                    <Badge variant="outline" className="h-5">{inactivePatients.length}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Turnos de Hoy</CardTitle>
              <CardDescription>
                {appointments.length} citas programadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-20">
                      <Calendar className="h-8 w-8 mb-2" />
                      <p className="text-sm">Sin turnos hoy.</p>
                    </div>
                  ) : (
                    appointments.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {app.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{app.patientName}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(app.date.toDate(), 'HH:mm')} - {app.reason}
                            </p>
                          </div>
                        </div>
                        <Badge variant={app.status === 'pending' ? 'outline' : 'default'} className="text-[10px] h-5">
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
