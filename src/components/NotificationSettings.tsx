import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Clock, 
  Calendar, 
  Save,
  ShieldCheck
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { NotificationConfig, NotificationChannel } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { getNotificationConfig } from '../lib/notification-service';
import { cn } from '../lib/utils';
import { Separator } from './ui/separator';

// Mock Switch for now if not available
const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (v: boolean) => void }) => (
  <button 
    className={cn("w-10 h-6 rounded-full transition-colors relative", checked ? "bg-primary" : "bg-muted")}
    onClick={() => onCheckedChange(!checked)}
  >
    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", checked ? "left-5" : "left-1")} />
  </button>
);

const NotificationSettings: React.FC = () => {
  const { profile } = useAuth();
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.clinicId) {
      loadConfig();
    }
  }, [profile?.clinicId]);

  const loadConfig = async () => {
    try {
      const data = await getNotificationConfig(profile!.clinicId);
      setConfig(data);
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !profile?.clinicId) return;

    try {
      await setDoc(doc(db, 'notification_configs', profile.clinicId), config);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  const toggleChannel = (channel: NotificationChannel) => {
    if (!config) return;
    const channels = config.channels.includes(channel)
      ? config.channels.filter(c => c !== channel)
      : [...config.channels, channel];
    setConfig({ ...config, channels });
  };

  if (loading) return <div className="p-8 text-center">Cargando configuración...</div>;
  if (!config) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
        <CardHeader className="p-8 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Notificaciones Automáticas</CardTitle>
              <CardDescription className="font-medium">Configura cómo y cuándo el sistema debe alertar a los clientes.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          {/* Channels */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Canales de Envío
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'in-app', label: 'In-App', icon: Bell },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
              ].map((channel) => (
                <div 
                  key={channel.id}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2",
                    config.channels.includes(channel.id as NotificationChannel)
                      ? "border-primary bg-primary/5"
                      : "border-muted bg-muted/20 opacity-50"
                  )}
                  onClick={() => toggleChannel(channel.id as NotificationChannel)}
                >
                  <channel.icon className="w-6 h-6" />
                  <span className="text-xs font-black uppercase tracking-widest">{channel.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-primary/5" />

          {/* Rules */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Reglas de Automatización
            </h3>
            
            <div className="grid gap-6">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5">
                <div className="space-y-1">
                  <Label className="text-sm font-black tracking-tight">Recordatorio de Vacunas</Label>
                  <p className="text-xs text-muted-foreground font-medium">Días de antelación para el aviso.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    className="w-20 h-10 rounded-xl text-center font-bold" 
                    value={config.vaccineReminderDays}
                    onChange={(e) => setConfig({ ...config, vaccineReminderDays: parseInt(e.target.value) })}
                  />
                  <span className="text-xs font-bold text-muted-foreground">días</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5">
                <div className="space-y-1">
                  <Label className="text-sm font-black tracking-tight">Recordatorio de Citas</Label>
                  <p className="text-xs text-muted-foreground font-medium">Horas de antelación para el aviso.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    className="w-20 h-10 rounded-xl text-center font-bold" 
                    value={config.appointmentReminderHours}
                    onChange={(e) => setConfig({ ...config, appointmentReminderHours: parseInt(e.target.value) })}
                  />
                  <span className="text-xs font-bold text-muted-foreground">horas</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5">
                <div className="space-y-1">
                  <Label className="text-sm font-black tracking-tight">Recordatorios de Tratamiento</Label>
                  <p className="text-xs text-muted-foreground font-medium">Notificar dosis diarias según receta.</p>
                </div>
                <Switch 
                  checked={config.treatmentReminderEnabled}
                  onCheckedChange={(val) => setConfig({ ...config, treatmentReminderEnabled: val })}
                />
              </div>
            </div>
          </div>

          <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex gap-4 items-start">
        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black tracking-tight">Sistema Inteligente</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            El sistema sincroniza automáticamente los eventos cada vez que un miembro del personal accede al dashboard, asegurando que no se pierda ninguna notificación importante.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
