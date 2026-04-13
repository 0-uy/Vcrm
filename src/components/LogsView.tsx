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
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Bitácora Interna
          </h2>
          <p className="text-muted-foreground font-medium">Notas rápidas, incidencias y recordatorios del equipo.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl h-12 px-6 shadow-lg shadow-primary/20 font-bold">
              <Plus className="w-5 h-5" /> Nueva Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] glass border-none shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Agregar Nota a la Bitácora</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="content" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contenido de la nota</Label>
                <Textarea 
                  id="content" 
                  placeholder="Escribe aquí incidencias, notas del día, recordatorios..." 
                  className="min-h-[180px] rounded-2xl border-border bg-card shadow-sm focus:shadow-md transition-all resize-none p-4"
                  value={newLog.content}
                  onChange={e => setNewLog({ content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold">Cancelar</Button>
              <Button onClick={handleAddLog} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20">Guardar Nota</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Buscar en la bitácora..." 
          className="pl-10 h-12 rounded-xl border-border bg-card shadow-sm focus:shadow-md transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6">
        {filteredLogs.length === 0 ? (
          <div className="py-32 text-center border-2 border-dashed border-border rounded-[3rem] bg-card animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-primary/30" />
            </div>
            <p className="text-muted-foreground font-bold text-lg">No hay notas registradas aún.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="border border-border rounded-3xl group hover:shadow-xl transition-all duration-500 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 bg-primary/5 px-3 py-1.5 rounded-full">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary/50" />
                    {format(log.date.toDate(), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => handleDeleteLog(log.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                  <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed pl-6 text-foreground/90">{log.content}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsView;
