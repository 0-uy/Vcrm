import React, { useState, useEffect } from 'react';
import { useAuth } from './components/AuthProvider';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientsView from './components/PatientsView';
import PatientDetailView from './components/PatientDetailView';
import AppointmentsView from './components/AppointmentsView';
import LogsView from './components/LogsView';
import InventoryView from './components/InventoryView';
import SuperAdminView from './components/SuperAdminView';
import DailyBoard from './components/DailyBoard';
import LoginView from './components/LoginView';
import NotificationSettings from './components/NotificationSettings';
import { Patient } from './types';
import { Toaster } from './components/ui/sonner';
import { ShieldAlert, LogOut } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import NotificationCenter from './components/NotificationCenter';
import GlobalSearch from './components/GlobalSearch';
import LandingPage from './components/LandingPage';

export default function App() {
  const { user, profile, clinic, loading, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      setActiveTab('superadmin');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setShowLogin(false);
    }
  }, [user]);

  const isSuspended = clinic?.status === 'suspended' && profile?.role !== 'superadmin';

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
          <div className="relative">
            <div className="w-20 h-20 border-[6px] border-primary/10 rounded-3xl" />
            <div className="absolute inset-0 w-20 h-20 border-[6px] border-primary border-t-transparent rounded-3xl animate-spin" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VetCare CRM
            </h2>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/50 animate-pulse">
              Iniciando sistema...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showLogin) {
      return (
        <>
          <LoginView onBack={() => setShowLogin(false)} />
          <Toaster position="top-center" richColors />
        </>
      );
    }
    return <LandingPage onEnter={() => setShowLogin(true)} />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
            Sincronizando Perfil...
          </p>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-destructive/10 text-destructive rounded-[2rem] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight">Cuenta Suspendida</h1>
              <p className="text-muted-foreground font-medium">
                El acceso para la clínica <span className="text-foreground font-bold">{clinic?.name}</span> ha sido suspendido.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-4">
              <Button variant="ghost" className="w-full h-12 rounded-xl gap-2 font-bold" onClick={() => signOut(auth)}>
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    if (selectedPatient) {
      return (
        <motion.div key="patient-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <PatientDetailView patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
        </motion.div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'patients': return <PatientsView onSelectPatient={setSelectedPatient} />;
      case 'appointments': return <AppointmentsView />;
      case 'logs': return <LogsView />;
      case 'inventory': return <InventoryView />;
      case 'daily': return <DailyBoard />;
      case 'superadmin': return <SuperAdminView />;
      case 'settings': return <NotificationSettings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedPatient(null);
        }} 
        onSelectPatient={setSelectedPatient}
      />
      <main className="md:pl-64 min-h-screen">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          <div className="flex items-center justify-between gap-4 mb-6 md:hidden">
            <div className="flex-1">
              <GlobalSearch onSelectPatient={setSelectedPatient} />
            </div>
            <NotificationCenter />
          </div>
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
