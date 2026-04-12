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
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, profile, clinic, loading, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const isSuspended = clinic?.status === 'suspended' && profile?.role !== 'superadmin';

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Cargando VetCare CRM...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <>
        <LoginView />
        <Toaster position="top-center" />
      </>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Cuenta Suspendida</h1>
            <p className="text-muted-foreground">
              Lo sentimos, el acceso para la clínica <strong>{clinic?.name}</strong> ha sido suspendido.
            </p>
            {clinic?.suspendedReason && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-sm italic">
                " {clinic.suspendedReason} "
              </div>
            )}
          </div>
          <div className="pt-4">
            <Button variant="outline" className="gap-2" onClick={() => signOut(auth)}>
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si crees que esto es un error, por favor contacta al soporte técnico.
          </p>
        </div>
        <Toaster position="top-center" />
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
