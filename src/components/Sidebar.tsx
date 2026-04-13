import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Package,
  ShieldCheck,
  LayoutGrid,
  Stethoscope
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { auth } from '../firebase';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'appointments', label: 'Agenda', icon: Calendar },
    { id: 'daily', label: 'Flow del Día', icon: LayoutGrid },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'logs', label: 'Bitácora', icon: ClipboardList },
  ];

  if (profile?.role === 'superadmin') {
    menuItems.push({ id: 'superadmin', label: 'Super Admin', icon: ShieldCheck });
  }

  const handleLogout = () => auth.signOut();

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 glass dark:glass-dark border-r border-primary/5 transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black shadow-xl shadow-primary/30 rotate-3 group-hover:rotate-0 transition-transform">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight">VetCare</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-70">PMS & CRM</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>

            <nav className="space-y-1.5">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 rounded-xl h-11 px-4 transition-all duration-300 font-bold",
                    activeTab === item.id 
                      ? "shadow-lg shadow-primary/20 bg-primary text-primary-foreground" 
                      : "hover:bg-primary/10 hover:text-primary text-muted-foreground"
                  )}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                >
                  <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", activeTab === item.id ? "" : "opacity-70")} />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-6">
            <Separator className="bg-primary/10" />
            <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-primary/5 border border-primary/10 glass dark:glass-dark">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/10">
                {profile?.displayName?.charAt(0) || profile?.email.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{profile?.displayName || 'Usuario'}</p>
                <p className="text-[9px] text-muted-foreground truncate uppercase font-black tracking-widest opacity-70">
                  {profile?.role === 'clinic_admin' ? 'Administrador' : 
                   profile?.role === 'superadmin' ? 'Super Admin' : 
                   profile?.role === 'staff' ? 'Personal' : profile?.role}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-11 px-4 font-bold transition-all" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
