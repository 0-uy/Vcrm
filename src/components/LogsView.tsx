import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Trash2,
  Calendar as CalendarIcon,
  Filter
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { InternalLog } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const LogsView: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<InternalLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLog, setNewLog] = useState({ content: '' });

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'logs'),
      where('clinicId', '==', profile.clinicId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logs');
    });

    return () => unsubscribe();
  }, [profile]);

  const handleAddLog = async () => {
    if (!profile || !newLog.content) {
      toast.error('Por favor escribe algo en la bitácora.');
      return;
    }

    try {
      await addDoc(collection(db, 'logs'), {
        content: newLog.content,
        date: Timestamp.now(),
        clinicId: profile.clinicId,
      });
      setIsAddDialogOpen(false);
      setNewLog({ content: '' });
      toast.success('Nota guardada.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'logs', id));
      toast.success('Nota eliminada.');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar.');
    }
  };

  const filteredLogs = logs.filter(l => 
    l.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bitácora Interna</h2>
          <p className="text-muted-foreground">Notas rápidas, incidencias y recordatorios del equipo.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nueva Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Agregar Nota a la Bitácora</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="content">Contenido de la nota</Label>
                <Textarea 
                  id="content" 
                  placeholder="Escribe aquí incidencias, notas del día, etc." 
                  className="min-h-[150px]"
                  value={newLog.content}
                  onChange={e => setNewLog({ content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddLog}>Guardar Nota</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar en la bitácora..." 
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center border rounded-lg border-dashed">
            <p className="text-muted-foreground">No hay notas registradas.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="group">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <CalendarIcon className="w-3 h-3" />
                    {format(log.date.toDate(), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteLog(log.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsView;
