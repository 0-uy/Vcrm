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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Panel de Super Admin</h2>
        <p className="text-muted-foreground">Gestión global de clínicas y suscripciones.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar clínica..." 
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="px-3 py-1">
            Total Clínicas: {clinics.length}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClinics.map((clinic) => (
          <Card key={clinic.id} className={clinic.status === 'suspended' ? 'opacity-75 border-destructive/20' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{clinic.name}</CardTitle>
                    <CardDescription className="text-xs">ID: {clinic.id}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {clinic.status === 'suspended' ? (
                      <DropdownMenuItem onClick={() => handleUpdateStatus(clinic.id, 'active')}>
                        <Play className="w-4 h-4 mr-2 text-green-500" /> Activar Clínica
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => {
                        setSelectedClinic(clinic);
                        setIsSuspendDialogOpen(true);
                      }}>
                        <Ban className="w-4 h-4 mr-2 text-destructive" /> Suspender Clínica
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <CreditCard className="w-4 h-4 mr-2" /> Gestionar Plan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Estado:</span>
                </div>
                {getStatusBadge(clinic.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Usuarios</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-bold">{clinic.userCount}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Pacientes</p>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <span className="font-bold">{clinic.patientCount}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium capitalize">{clinic.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimiento:</span>
                  <span className="font-medium">
                    {format(clinic.expiresAt.toDate(), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>

              {clinic.status === 'suspended' && clinic.suspendedReason && (
                <div className="p-2 bg-destructive/10 rounded border border-destructive/20 text-[10px] text-destructive">
                  <p className="font-bold mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Razón de suspensión:
                  </p>
                  <p>{clinic.suspendedReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
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
