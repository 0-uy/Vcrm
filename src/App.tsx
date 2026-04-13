import React, { useState } from 'react';
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
import { Patient } from './types';
import { Toaster } from './components/ui/sonner';
import { ShieldAlert, LogOut } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, profile, clinic, loading, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const isSuspended = clinic?.status === 'suspended' && profile?.role !== 'superadmin';

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
          <div className="relative">
            <div className="w-20 h-20 border-[6px] border-primary/10 rounded-3xl" />
            <div className="absolute inset-0 w-20 h-20 border-[6px] border-primary border-t-transparent rounded-3xl animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
            </div>
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

  if (!user || !profile) {
    return (
      <>
        <LoginView />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-destructive/10 rounded-full blur-[120px]" />
        </div>

        <Card className="max-w-md w-full glass dark:glass-dark border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <CardContent className="p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-destructive/10 text-destructive rounded-[2rem] flex items-center justify-center mx-auto shadow-inner rotate-3">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight">Cuenta Suspendida</h1>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Lo sentimos, el acceso para la clínica <span className="text-foreground font-bold">{clinic?.name}</span> ha sido suspendido temporalmente.
              </p>
              {clinic?.suspendedReason && (
                <div className="mt-6 p-6 bg-destructive/5 rounded-2xl text-sm font-bold italic border border-destructive/10 text-destructive/80">
                  " {clinic.suspendedReason} "
                </div>
              )}
            </div>
            <div className="pt-4 flex flex-col gap-4">
              <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => window.location.href = 'mailto:soporte@vetcarecrm.com'}>
                Contactar Soporte
              </Button>
              <Button variant="ghost" className="w-full h-12 rounded-xl gap-2 font-bold" onClick={() => signOut(auth)}>
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </Button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              VetCare CRM Security Protocol
            </p>
          </CardContent>
        </Card>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  const renderContent = () => {
    if (selectedPatient) {
      return (
        <motion.div
          key="patient-detail"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <PatientDetailView 
            patient={selectedPatient} 
            onBack={() => setSelectedPatient(null)} 
          />
        </motion.div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Dashboard />
          </motion.div>
        );
      case 'patients':
        return (
          <motion.div
            key="patients"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PatientsView onSelectPatient={setSelectedPatient} />
          </motion.div>
        );
      case 'appointments':
        return (
          <motion.div
            key="appointments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AppointmentsView />
          </motion.div>
        );
      case 'logs':
        return (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LogsView />
          </motion.div>
        );
      case 'inventory':
        return (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <InventoryView />
          </motion.div>
        );
      case 'daily':
        return (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DailyBoard />
          </motion.div>
        );
      case 'superadmin':
        return (
          <motion.div
            key="superadmin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SuperAdminView />
          </motion.div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedPatient(null);
      }} />
      
      <main className="md:pl-64 min-h-screen">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>

      <Toaster position="top-center" />
    </div>
  );
}
