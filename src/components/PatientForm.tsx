import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  X, 
  Image as ImageIcon,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Separator } from './ui/separator';
import { Patient, Attachment } from '../types';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface PatientFormProps {
  initialData?: Partial<Patient>;
  onSubmit: (data: Partial<Patient>, attachments: any[]) => void;
  onCancel: () => void;
  title: string;
}

const PatientForm: React.FC<PatientFormProps> = ({ initialData, onSubmit, onCancel, title }) => {
  const [formData, setFormData] = useState<Partial<Patient>>({
    species: 'Perro',
    sex: 'no_especificado',
    isNeutered: 'no_informado',
    ...initialData
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          preview: reader.result as string,
          size: file.size
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAddUrl = () => {
    if (!urlInput) return;
    setAttachments(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      url: urlInput,
      name: 'Adjunto por URL',
      type: 'url',
      preview: urlInput
    }]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Datos Básicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre Mascota *</Label>
            <Input 
              placeholder="Ej: Max" 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Especie *</Label>
            <Select 
              value={formData.species} 
              onValueChange={v => setFormData({...formData, species: v})}
            >
              <SelectTrigger className="rounded-xl bg-muted/30 border-border">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Perro">Perro</SelectItem>
                <SelectItem value="Gato">Gato</SelectItem>
                <SelectItem value="Ave">Ave</SelectItem>
                <SelectItem value="Conejo">Conejo</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Raza</Label>
            <Input 
              placeholder="Ej: Golden Retriever" 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.race || ''} 
              onChange={e => setFormData({...formData, race: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Edad (años)</Label>
              <Input 
                type="number" 
                placeholder="0" 
                className="rounded-xl bg-muted/30 border-border"
                value={formData.age || ''} 
                onChange={e => setFormData({...formData, age: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Peso (kg)</Label>
              <Input 
                type="number" 
                placeholder="0.0" 
                className="rounded-xl bg-muted/30 border-border"
                value={formData.weight || ''} 
                onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Sexo</Label>
            <Select 
              value={formData.sex} 
              onValueChange={v => setFormData({...formData, sex: v as any})}
            >
              <SelectTrigger className="rounded-xl bg-muted/30 border-border">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="macho">Macho</SelectItem>
                <SelectItem value="hembra">Hembra</SelectItem>
                <SelectItem value="no_especificado">No especificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Castrado / Esterilizado</Label>
            <Select 
              value={formData.isNeutered} 
              onValueChange={v => setFormData({...formData, isNeutered: v as any})}
            >
              <SelectTrigger className="rounded-xl bg-muted/30 border-border">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="no_informado">No informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator className="bg-primary/5" />

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Información Clínica
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Alergias Conocidas</Label>
            <Input 
              placeholder="Ej: Penicilina, polen..." 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.allergies || ''} 
              onChange={e => setFormData({...formData, allergies: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Antecedentes o Enfermedades Relevantes</Label>
            <Textarea 
              placeholder="Cirugías previas, enfermedades crónicas..." 
              className="rounded-xl bg-muted/30 border-border min-h-[80px]"
              value={formData.medicalHistory || ''} 
              onChange={e => setFormData({...formData, medicalHistory: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Medicación Actual</Label>
            <Textarea 
              placeholder="Medicamentos que está tomando actualmente..." 
              className="rounded-xl bg-muted/30 border-border min-h-[80px]"
              value={formData.currentMedication || ''} 
              onChange={e => setFormData({...formData, currentMedication: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Observaciones Generales</Label>
            <Textarea 
              placeholder="Cualquier otro detalle importante..." 
              className="rounded-xl bg-muted/30 border-border min-h-[80px]"
              value={formData.observations || ''} 
              onChange={e => setFormData({...formData, observations: e.target.value})}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-primary/5" />

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Información del Dueño
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre del Dueño *</Label>
            <Input 
              placeholder="Ej: Juan Pérez" 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.ownerName || ''} 
              onChange={e => setFormData({...formData, ownerName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Teléfono</Label>
            <Input 
              placeholder="Ej: +54 9 11..." 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.ownerPhone || ''} 
              onChange={e => setFormData({...formData, ownerPhone: e.target.value})}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Contacto de Emergencia Opcional</Label>
            <Input 
              placeholder="Nombre y teléfono de otra persona de contacto" 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.emergencyContact || ''} 
              onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Dirección</Label>
            <Input 
              placeholder="Ej: Av. Siempre Viva 742" 
              className="rounded-xl bg-muted/30 border-border"
              value={formData.ownerAddress || ''} 
              onChange={e => setFormData({...formData, ownerAddress: e.target.value})}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-primary/5" />

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Adjuntos
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Cámara</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Galería</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => setShowUrlInput(!showUrlInput)}
          >
            <LinkIcon className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">URL</span>
          </Button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,application/pdf" 
          multiple 
          onChange={(e) => handleFileChange(e)} 
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment" 
          onChange={(e) => handleFileChange(e, true)} 
        />

        {showUrlInput && (
          <div className="flex gap-2 animate-in slide-in-from-top-2">
            <Input 
              placeholder="Pegar URL de imagen o archivo..." 
              className="rounded-xl bg-muted/30 border-border"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
            />
            <Button onClick={handleAddUrl} className="rounded-xl">Agregar</Button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-border bg-muted/30">
                {att.type === 'image' || att.type === 'url' ? (
                  <img 
                    src={att.preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    <FileText className="w-8 h-8 text-primary/40 mb-2" />
                    <span className="text-[8px] font-bold truncate w-full">{att.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => removeAttachment(att.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6 flex flex-col sm:flex-row gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1 h-12 rounded-xl font-bold">
          Cancelar
        </Button>
        <Button 
          onClick={() => onSubmit(formData, attachments)} 
          className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
        >
          {initialData?.id ? 'Guardar Cambios' : 'Registrar Paciente'}
        </Button>
      </div>
    </div>
  );
};

export default PatientForm;
