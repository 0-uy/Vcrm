import React, { useState, useEffect } from 'react';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Phone, 
  Calendar as CalendarIcon,
  Dog,
  Cat,
  Rabbit,
  Bird,
  Trash2,
  Edit2,
  ChevronRight,
  Users,
  AlertCircle
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
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { Patient } from '../types';
import { handleFirestoreError, OperationType, logActivity, generateSearchKeywords } from '../lib/firestore-utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Label } from './ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

import PatientForm from './PatientForm';

interface PatientsViewProps {
  onSelectPatient: (patient: Patient) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({ onSelectPatient }) => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    species: 'Perro',
  });

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'patients'),
      where('clinicId', '==', profile.clinicId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    });

    return () => unsubscribe();
  }, [profile]);

  const handleAddPatient = async (data: Partial<Patient>, attachments: any[]) => {
    if (!profile || !data.name || !data.ownerName) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      const searchKeywords = generateSearchKeywords([
        data.name,
        data.ownerName,
        data.ownerPhone,
        data.species,
        data.race,
        data.observations,
        data.allergies,
        data.medicalHistory,
        data.currentMedication,
        data.ownerAddress,
        data.ownerNeighborhood
      ]);

      const docRef = await addDoc(collection(db, 'patients'), {
        ...data,
        clinicId: profile.clinicId,
        createdAt: Timestamp.now(),
        searchKeywords,
      });

      // Handle attachments (simulated)
      for (const att of attachments) {
        await addDoc(collection(db, 'attachments'), {
          patientId: docRef.id,
          clinicId: profile.clinicId,
          date: Timestamp.now(),
          name: att.name,
          type: att.type,
          url: att.url || att.preview, // In a real app, upload to Storage first
          size: att.size || 0
        });
      }

      await logActivity({
        type: 'consultation',
        description: `Registró al paciente "${data.name}"`,
        patientName: data.name,
        clinicId: profile.clinicId
      });

      setIsAddDialogOpen(false);
      setNewPatient({ species: 'Perro' });
      toast.success('Paciente agregado correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  const handleEditPatient = async (data: Partial<Patient>, attachments: any[]) => {
    if (!profile || !editingPatient || !data.name || !data.ownerName) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      const { id } = editingPatient;
      const searchKeywords = generateSearchKeywords([
        data.name,
        data.ownerName,
        data.ownerPhone,
        data.species,
        data.race,
        data.observations,
        data.allergies,
        data.medicalHistory,
        data.currentMedication,
        data.ownerAddress,
        data.ownerNeighborhood
      ]);

      await updateDoc(doc(db, 'patients', id), {
        ...data,
        updatedAt: Timestamp.now(),
        searchKeywords,
      });

      // Handle new attachments
      for (const att of attachments) {
        if (!att.url && att.preview) { // New attachment
          await addDoc(collection(db, 'attachments'), {
            patientId: id,
            clinicId: profile.clinicId,
            date: Timestamp.now(),
            name: att.name,
            type: att.type,
            url: att.preview,
            size: att.size || 0
          });
        }
      }

      await logActivity({
        type: 'consultation',
        description: `Actualizó información del paciente "${data.name}"`,
        patientId: id,
        patientName: data.name,
        clinicId: profile.clinicId
      });

      setIsEditDialogOpen(false);
      setEditingPatient(null);
      toast.success('Información actualizada correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${editingPatient?.id}`);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSpeciesIcon = (species: string) => {
    switch (species.toLowerCase()) {
      case 'perro': return <Dog className="w-4 h-4" />;
      case 'gato': return <Cat className="w-4 h-4" />;
      case 'ave': return <Bird className="w-4 h-4" />;
      case 'conejo': return <Rabbit className="w-4 h-4" />;
      default: return <Dog className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Pacientes
          </h2>
          <p className="text-muted-foreground font-medium">Gestiona la base de datos de mascotas y sus dueños.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20 rounded-xl px-6">
              <Plus className="w-4 h-4" /> Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] glass border-none shadow-2xl p-0 overflow-hidden rounded-[2rem]">
            <div className="p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-3xl font-black tracking-tight">Nuevo Paciente</DialogTitle>
              </DialogHeader>
              <PatientForm 
                onSubmit={handleAddPatient} 
                onCancel={() => setIsAddDialogOpen(false)} 
                title="Nuevo Paciente" 
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] glass border-none shadow-2xl p-0 overflow-hidden rounded-[2rem]">
            <div className="p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-3xl font-black tracking-tight">Editar Paciente</DialogTitle>
              </DialogHeader>
              {editingPatient && (
                <PatientForm 
                  initialData={editingPatient}
                  onSubmit={handleEditPatient} 
                  onCancel={() => {
                    setIsEditDialogOpen(false);
                    setEditingPatient(null);
                  }} 
                  title="Editar Paciente" 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Buscar por nombre de mascota o dueño..." 
          className="pl-12 h-14 text-lg rounded-2xl border-border bg-card shadow-sm focus:shadow-md transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patient List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-card border border-dashed border-border rounded-3xl">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
              <Users className="w-10 h-10" />
            </div>
            <p className="text-muted-foreground font-medium text-lg">No se encontraron pacientes.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="border border-border rounded-3xl overflow-hidden group cursor-pointer transition-all duration-500 hover:-translate-y-1 shadow-lg"
              onClick={() => onSelectPatient(patient)}
            >
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {getSpeciesIcon(patient.species)}
                      </div>
                      <div>
                        <h3 className="font-black text-xl leading-tight group-hover:text-primary transition-colors">{patient.name}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">
                          {patient.species} • {patient.race || 'Sin raza'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPatient(patient);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Badge variant="secondary" className="font-bold rounded-lg px-2 py-0.5 bg-primary/5 text-primary border-none">
                          {patient.age || 0} años
                        </Badge>
                      </div>
                      {patient.nextVaccineDate && isBefore(patient.nextVaccineDate.toDate(), new Date()) && (
                        <Badge variant="destructive" className="text-[10px] font-black uppercase h-6 gap-1.5 px-3 rounded-full shadow-sm shadow-destructive/20">
                          <AlertCircle className="w-3.5 h-3.5" /> Vacuna Vencida
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground bg-muted/30 dark:bg-white/5 p-2 rounded-xl border border-transparent group-hover:border-primary/5 transition-all">
                      <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                      </div>
                      <span className="truncate">{patient.ownerName}</span>
                    </div>
                    {patient.ownerPhone && (
                      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground bg-muted/30 dark:bg-white/5 p-2 rounded-xl border border-transparent group-hover:border-primary/5 transition-all">
                        <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shadow-sm">
                          <Phone className="w-3.5 h-3.5 text-primary/70" />
                        </div>
                        <span>{patient.ownerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-primary/5 px-6 py-4 flex items-center justify-between group-hover:bg-primary/10 transition-colors border-t border-primary/5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Registrado: {format(patient.createdAt.toDate(), 'dd MMM yyyy', { locale: es })}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-4 h-4 text-primary" />
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

export default PatientsView;
