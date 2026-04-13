import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Search,
  MoreHorizontal,
  Ban,
  Play,
  Calendar,
  CreditCard,
  Activity
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  Timestamp,
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { Clinic, ClinicStatus } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface ClinicWithStats extends Clinic {
  userCount: number;
  patientCount: number;
}

const SuperAdminView: React.FC = () => {
  const [clinics, setClinics] = useState<ClinicWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<ClinicWithStats | null>(null);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspendedReason, setSuspendedReason] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'clinics'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const clinicsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clinic));
      
      // Fetch stats for each clinic
      const clinicsWithStats = await Promise.all(clinicsData.map(async (clinic) => {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('clinicId', '==', clinic.id)));
        const patientsSnap = await getDocs(query(collection(db, 'patients'), where('clinicId', '==', clinic.id)));
        
        return {
          ...clinic,
          userCount: usersSnap.size,
          patientCount: patientsSnap.size
        };
      }));
      
      setClinics(clinicsWithStats);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clinics');
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (clinicId: string, status: ClinicStatus, reason?: string) => {
    try {
      await updateDoc(doc(db, 'clinics', clinicId), { 
        status,
        suspendedReason: reason || null
      });
      toast.success(`Clínica ${status === 'suspended' ? 'suspendida' : 'activada'} correctamente.`);
      setIsSuspendDialogOpen(false);
      setSuspendedReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clinics/${clinicId}`);
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: ClinicStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Activa</Badge>;
      case 'suspended': return <Badge variant="destructive">Suspendida</Badge>;
      case 'trial': return <Badge className="bg-blue-500">Prueba</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Panel Superadmin
          </h2>
          <p className="text-muted-foreground font-medium">Gestión global de clínicas y suscripciones.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-muted/50 border border-border flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Acceso Restringido</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-border shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Clínicas</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{clinics.length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Registradas en el sistema</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Clínicas Activas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{clinics.filter(c => c.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Operando normalmente</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Suspensiones</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{clinics.filter(c => c.status === 'suspended').length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Cuentas con acceso restringido</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar clínica por nombre o ID..." 
            className="pl-9 h-11 rounded-xl border-border bg-card shadow-sm focus:shadow-md transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClinics.map((clinic) => (
          <Card key={clinic.id} className={cn(
            "border border-border shadow-xl overflow-hidden group transition-all duration-500 hover:-translate-y-1",
            clinic.status === 'suspended' ? 'opacity-75' : ''
          )}>
            <CardHeader className="pb-4 border-b border-primary/5 bg-primary/5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">{clinic.name}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-black tracking-widest">ID: {clinic.id.substring(0, 8)}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border border-border bg-popover shadow-2xl">
                    {clinic.status === 'suspended' ? (
                      <DropdownMenuItem onClick={() => handleUpdateStatus(clinic.id, 'active')} className="rounded-lg">
                        <Play className="w-4 h-4 mr-2 text-emerald-500" /> Activar Clínica
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => {
                        setSelectedClinic(clinic);
                        setIsSuspendDialogOpen(true);
                      }} className="rounded-lg">
                        <Ban className="w-4 h-4 mr-2 text-destructive" /> Suspender Clínica
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-primary/5" />
                    <DropdownMenuItem className="rounded-lg">
                      <CreditCard className="w-4 h-4 mr-2" /> Gestionar Plan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Estado</span>
                {getStatusBadge(clinic.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-muted/30 dark:bg-white/5 border border-transparent hover:border-primary/5 transition-all">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Usuarios</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-lg font-black">{clinic.userCount}</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-muted/30 dark:bg-white/5 border border-transparent hover:border-primary/5 transition-all">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Pacientes</p>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-lg font-black">{clinic.patientCount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-primary/5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Plan Actual</span>
                  <Badge variant="outline" className="rounded-lg font-black uppercase text-[10px] border-primary/20 text-primary">
                    {clinic.plan}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Vencimiento</span>
                  <span className="text-xs font-black">
                    {format(clinic.expiresAt.toDate(), 'dd MMM yyyy', { locale: es })}
                  </span>
                </div>
              </div>

              {clinic.status === 'suspended' && clinic.suspendedReason && (
                <div className="p-3 bg-destructive/5 rounded-2xl border border-destructive/10 text-[10px] text-destructive animate-in slide-in-from-top-2">
                  <p className="font-black mb-1 flex items-center gap-1 uppercase tracking-widest">
                    <ShieldAlert className="w-3.5 h-3.5" /> Razón de suspensión
                  </p>
                  <p className="font-medium leading-relaxed">{clinic.suspendedReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent className="glass border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle>Suspender Clínica</DialogTitle>
            <DialogDescription>
              La clínica "{selectedClinic?.name}" será bloqueada. Sus usuarios no podrán acceder al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Razón de la suspensión</Label>
              <Textarea 
                id="reason" 
                placeholder="Ej: Falta de pago, violación de términos..."
                value={suspendedReason}
                onChange={e => setSuspendedReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedClinic && handleUpdateStatus(selectedClinic.id, 'suspended', suspendedReason)}
            >
              Confirmar Suspensión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminView;
