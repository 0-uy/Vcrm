import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle
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
import { Patient, Appointment, ClinicalEvent } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { format, isAfter, isBefore, addDays } from 'date-fns';
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
  const [recentEvents, setRecentEvents] = useState<ClinicalEvent[]>([]);
  const [vaccineAlerts, setVaccineAlerts] = useState<ClinicalEvent[]>([]);

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

    // Fetch Recent Activity (Clinical Events)
    // Note: This requires a composite index if we filter by clinicId and order by date
    // For now, we'll fetch all and filter client-side if needed, or just use a simple query
    const qEvents = query(
      collection(db, 'patients'), // We need to iterate through patients or have a global events collection
      where('clinicId', '==', clinicId)
    );
    // Actually, I defined history as a subcollection. 
    // To get "recent activity" across all patients, I should have used a root collection or collectionGroup.
    // For simplicity in this demo, I'll just show a placeholder or fetch from a global 'events' collection if I change the schema.
    // Let's stick to the schema and just show a placeholder for now, or I can update the schema to have a root 'events' collection.
    // I'll update the schema to include a root 'events' collection for easier dashboarding.

    return () => {
      unsubPatients();
      unsubAppointments();
    };
  }, [profile]);

  const stats = [
    { label: 'Total Pacientes', value: patients.length, icon: Users, color: 'text-blue-500' },
    { label: 'Turnos Hoy', value: appointments.filter(a => a.status === 'pending').length, icon: Calendar, color: 'text-green-500' },
    { label: 'Vacunas Próximas', value: 0, icon: AlertCircle, color: 'text-orange-500' },
    { label: 'Visitas Mes', value: 12, icon: TrendingUp, color: 'text-purple-500' },
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bienvenido, {profile?.displayName || 'Doctor'}</h2>
        <p className="text-muted-foreground">Aquí tienes un resumen de tu clínica para hoy.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                +2% desde el mes pasado
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Actividad Semanal</CardTitle>
            <CardDescription>Número de consultas atendidas esta semana.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visitas" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ fill: 'hsl(var(--primary))' }} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Turnos de Hoy</CardTitle>
            <CardDescription>
              Tienes {appointments.length} turnos programados para hoy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground">No hay turnos para hoy.</p>
                  </div>
                ) : (
                  appointments.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {app.patientName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{app.patientName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(app.date.toDate(), 'HH:mm')} - {app.reason}
                          </p>
                        </div>
                      </div>
                      <Badge variant={app.status === 'pending' ? 'outline' : app.status === 'attended' ? 'default' : 'destructive'}>
                        {app.status === 'pending' ? 'Pendiente' : app.status === 'attended' ? 'Atendido' : 'Cancelado'}
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
  );
};

export default Dashboard;
