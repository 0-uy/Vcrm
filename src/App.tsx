import React, { useState } from 'react';
import { useAuth } from './components/AuthProvider';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientsView from './components/PatientsView';
import PatientDetailView from './components/PatientDetailView';
import AppointmentsView from './components/AppointmentsView';
import LogsView from './components/LogsView';
import InventoryView from './components/InventoryView';
import LoginView from './components/LoginView';
import { Patient } from './types';
import { Toaster } from './components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, profile, loading, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
