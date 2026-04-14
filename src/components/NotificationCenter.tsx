import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  Calendar, 
  Syringe, 
  Pill, 
  AlertCircle,
  MoreVertical,
  Settings
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { Notification, NotificationType } from '../types';
import { Button } from './ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './ui/popover';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const NotificationCenter: React.FC = () => {
  const { profile, clinic } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.clinicId) return;

    const q = query(
      collection(db, 'notifications'),
      where('clinicId', '==', profile.clinicId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => n.status === 'pending').length);
    });

    return () => unsubscribe();
  }, [profile?.clinicId]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        status: 'read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const pending = notifications.filter(n => n.status === 'pending');
    for (const n of pending) {
      await markAsRead(n.id);
    }
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'vaccine': return <Syringe className="w-4 h-4 text-emerald-500" />;
      case 'appointment': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'treatment': return <Pill className="w-4 h-4 text-amber-500" />;
      default: return <AlertCircle className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-2xl hover:bg-primary/5">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-[10px] font-black text-primary-foreground rounded-full flex items-center justify-center animate-in zoom-in duration-300">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden" align="end">
        <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
          <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notificaciones
          </h3>
          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-7 px-2 rounded-lg" onClick={markAllAsRead}>
            Marcar todo
          </Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-primary/5">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 transition-colors hover:bg-primary/5 cursor-pointer group relative",
                    n.status === 'pending' ? "bg-primary/[0.02]" : "opacity-60"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shadow-sm shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black tracking-tight">{n.title}</p>
                        <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                          {format(n.createdAt.toDate(), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest py-0 h-4 border-primary/10 bg-primary/5">
                          {n.patientName}
                        </Badge>
                        {n.status === 'pending' && (
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 bg-muted/30 border-t border-primary/5 text-center">
          <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest h-8 rounded-xl gap-2">
            <Settings className="w-3 h-3" /> Configuración
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
