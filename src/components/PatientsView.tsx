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
  Users
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface PatientsViewProps {
  onSelectPatient: (patient: Patient) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({ onSelectPatient }) => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const handleAddPatient = async () => {
    if (!profile || !newPatient.name || !newPatient.ownerName) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      await addDoc(collection(db, 'patients'), {
        ...newPatient,
        clinicId: profile.clinicId,
        createdAt: Timestamp.now(),
      });
      setIsAddDialogOpen(false);
      setNewPatient({ species: 'Perro' });
      toast.success('Paciente agregado correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-muted-foreground">Gestiona la base de datos de mascotas y sus dueños.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Paciente</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Mascota *</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Max" 
                    value={newPatient.name || ''} 
                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="species">Especie *</Label>
                  <Select 
                    value={newPatient.species} 
                    onValueChange={v => setNewPatient({...newPatient, species: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Perro">Perro</SelectItem>
                      <SelectItem value="Gato">Gato</SelectItem>
                      <SelectItem value="Ave">Ave</SelectItem>
                      <SelectItem value="Conejo">Conejo</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="race">Raza</Label>
                  <Input 
                    id="race" 
                    placeholder="Ej: Golden Retriever" 
                    value={newPatient.race || ''} 
                    onChange={e => setNewPatient({...newPatient, race: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Edad (años)</Label>
                  <Input 
                    id="age" 
                    type="number" 
                    placeholder="0" 
                    value={newPatient.age || ''} 
                    onChange={e => setNewPatient({...newPatient, age: Number(e.target.value)})}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nombre del Dueño *</Label>
                <Input 
                  id="ownerName" 
                  placeholder="Ej: Juan Pérez" 
                  value={newPatient.ownerName || ''} 
                  onChange={e => setNewPatient({...newPatient, ownerName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Teléfono del Dueño</Label>
                <Input 
                  id="ownerPhone" 
                  placeholder="Ej: +54 9 11..." 
                  value={newPatient.ownerPhone || ''} 
                  onChange={e => setNewPatient({...newPatient, ownerPhone: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddPatient}>Guardar Paciente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por nombre de mascota o dueño..." 
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patient List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
            <p className="text-muted-foreground">No se encontraron pacientes.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="group hover:border-primary/50 transition-colors cursor-pointer overflow-hidden"
              onClick={() => onSelectPatient(patient)}
            >
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {getSpeciesIcon(patient.species)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{patient.name}</h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          {patient.species} • {patient.race || 'Sin raza'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {patient.age || 0} años
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{patient.ownerName}</span>
                    </div>
                    {patient.ownerPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{patient.ownerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-muted/30 px-5 py-3 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                  <span className="text-xs text-muted-foreground">
                    Agregado el {format(patient.createdAt.toDate(), 'dd MMM yyyy', { locale: es })}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
