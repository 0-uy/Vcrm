import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Search,
  MoreHorizontal,
  Ban,
  Play,
  Activity,
  Plus
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { Clinic, ClinicStatus } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
      
      const clinicsWithStats = await Promise.all(clinicsData.map(async (clinic) => {
        // Optimización: Solo contamos, no traemos todos los datos de cada usuario/paciente
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
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (clinicId: string, status: ClinicStatus, reason?: string) => {
    try {
      await updateDoc(doc(db, 'clinics', clinicId), { 
        status,
        suspendedReason: reason || null
      });
      toast.success(status === 'suspended' ? 'Clínica Suspendida' : 'Clínica Activada');
      setIsSuspendDialogOpen(false);
      setSuspendedReason('');
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nivel de Acceso: Master</p>
          <h2 className="text-4xl font-black tracking-tighter">Panel de Ecosistema</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar clínica..." 
              className="pl-10 w-full md:w-[300px] h-11 rounded-xl bg-white/50 backdrop-blur-sm border-primary/5 focus:border-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid de Clínicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClinics.map((clinic) => (
          <Card key={clinic.id} className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white/40 backdrop-blur-md hover:shadow-2xl transition-all duration-500 group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-none shadow-2xl glass">
                    <DropdownMenuItem className="rounded-xl font-bold cursor-pointer" onClick={() => toast.info('Función de edición próximamente')}>
                      Editar Detalles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="opacity-50" />
                    {clinic.status !== 'active' ? (
                      <DropdownMenuItem 
                        className="rounded-xl font-bold text-green-600 cursor-pointer"
                        onClick={() => handleUpdateStatus(clinic.id, 'active')}
                      >
                        <Play className="w-4 h-4 mr-2" /> Activar Clínica
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        className="rounded-xl font-bold text-destructive cursor-pointer"
                        onClick={() => {
                          setSelectedClinic(clinic);
                          setIsSuspendDialogOpen(true);
                        }}
                      >
                        <Ban className="w-4 h-4 mr-2" /> Suspender Clínica
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-4">
                <h3 className="text-xl font-black tracking-tight line-clamp-1">{clinic.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-widest">{clinic.id}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Status Badge */}
              <div className="flex gap-2">
                {clinic.status === 'active' && <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-lg px-3 font-black uppercase text-[10px] tracking-widest">Activa</Badge>}
                {clinic.status === 'trial' && <Badge className="bg-blue-500/10 text-blue-600 border-none rounded-lg px-3 font-black uppercase text-[10px] tracking-widest">Prueba</Badge>}
                {clinic.status === 'suspended' && <Badge variant="destructive" className="rounded-lg px-3 font-black uppercase text-[10px] tracking-widest">Suspendida</Badge>}
              </div>

              {/* Estadísticas Rápidas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-lg font-black">{clinic.userCount}</span>
                  </div>
                </div>
                <div className="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pacientes</p>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-lg font-black">{clinic.patientCount}</span>
                  </div>
                </div>
              </div>

              {/* Información de Plan */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Plan:</span>
                  <span className="font-black text-primary">{clinic.plan}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Vence:</span>
                  <span>{format(clinic.expiresAt.toDate(), 'dd MMM, yyyy', { locale: es })}</span>
                </div>
              </div>

              {/* Razón de suspensión (si existe) */}
              {clinic.status === 'suspended' && clinic.suspendedReason && (
                <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
                  <p className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Motivo
                  </p>
                  <p className="text-xs font-medium text-destructive/80 leading-relaxed italic">"{clinic.suspendedReason}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Suspensión */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl glass p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Suspender Clínica</DialogTitle>
            <DialogDescription className="font-medium">
              Esto bloqueará el acceso a todos los usuarios de <strong>{selectedClinic?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Razón del Bloqueo</Label>
            <Textarea 
              placeholder="Ej: Incumplimiento de pago o términos del servicio..."
              className="rounded-2xl border-primary/10 focus:border-primary/30 min-h-[120px] resize-none p-4"
              value={suspendedReason}
              onChange={e => setSuspendedReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsSuspendDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-black uppercase tracking-widest text-xs h-12 px-8 shadow-lg shadow-destructive/20"
              onClick={() => selectedClinic && handleUpdateStatus(selectedClinic.id, 'suspended', suspendedReason)}
            >
              Confirmar Bloqueo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminView;
