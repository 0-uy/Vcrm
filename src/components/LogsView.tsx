import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Trash2,
  Calendar as CalendarIcon,
  Filter,
  Camera,
  X,
  Image as ImageIcon
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
  const [newLog, setNewLog] = useState({ content: '', imageUrl: '' });
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'logs'),
      where('clinicId', '==', profile.clinicId)
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
        imageUrl: newLog.imageUrl || null,
        date: Timestamp.now(),
        clinicId: profile.clinicId,
        userName: profile.displayName || 'Staff',
      });
      setIsAddDialogOpen(false);
      setNewLog({ content: '', imageUrl: '' });
      toast.success('Nota guardada.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("No se pudo acceder a la cámara");
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setNewLog(prev => ({ ...prev, imageUrl: dataUrl }));
        stopCamera();
      }
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contenido de la nota</Label>
                  <Textarea 
                    id="content" 
                    placeholder="Escribe aquí incidencias, notas del día, recordatorios..." 
                    className="min-h-[120px] rounded-2xl border-border bg-card shadow-sm focus:shadow-md transition-all resize-none p-4"
                    value={newLog.content}
                    onChange={e => setNewLog({ ...newLog, content: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Adjuntar Imagen</Label>
                  
                  {newLog.imageUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-primary/20 aspect-video group">
                      <img src={newLog.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setNewLog(prev => ({ ...prev, imageUrl: '' }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : isCapturing ? (
                    <div className="relative rounded-2xl overflow-hidden border border-primary/20 aspect-video bg-black">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <Button onClick={capturePhoto} className="rounded-full h-12 w-12 p-0">
                          <div className="w-8 h-8 rounded-full border-4 border-white" />
                        </Button>
                        <Button variant="destructive" onClick={stopCamera} className="rounded-full h-12 w-12 p-0">
                          <X className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col gap-2 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                        onClick={startCamera}
                      >
                        <Camera className="w-6 h-6 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cámara</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col gap-2 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewLog(prev => ({ ...prev, imageUrl: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                      >
                        <ImageIcon className="w-6 h-6 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Galería</span>
                      </Button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
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
                  <div className="pl-6 space-y-4">
                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-foreground/90">{log.content}</p>
                    {log.imageUrl && (
                      <div className="max-w-md rounded-2xl overflow-hidden border border-primary/10 shadow-sm">
                        <img 
                          src={log.imageUrl} 
                          alt="Log attachment" 
                          className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
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

export default LogsView;
