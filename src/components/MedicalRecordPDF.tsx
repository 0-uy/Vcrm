import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Patient, ClinicalEvent, SOAPNote, Clinic } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Use standard fonts to avoid loading issues
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 10,
  },
  clinicInfo: {
    flexDirection: 'column',
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    textTransform: 'uppercase',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    padding: 4,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  gridItem: {
    width: '33.33%',
    marginBottom: 6,
  },
  label: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
  },
  eventCard: {
    marginBottom: 10,
    padding: 8,
    borderLeft: 3,
    borderLeftColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#3b82f6',
    textTransform: 'uppercase',
  },
  eventDate: {
    fontSize: 8,
    color: '#9ca3af',
  },
  eventDescription: {
    fontSize: 9,
  },
  soapCard: {
    marginBottom: 12,
    padding: 10,
    border: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  soapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  soapItem: {
    width: '50%',
    marginBottom: 8,
    paddingRight: 10,
  },
  soapAssessment: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    padding: 6,
    borderRadius: 4,
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  }
});

interface MedicalRecordPDFProps {
  patient: Patient;
  history: ClinicalEvent[];
  soapNotes: SOAPNote[];
  clinic: Clinic | null;
}

const MedicalRecordPDF: React.FC<MedicalRecordPDFProps> = ({ patient, history, soapNotes, clinic }) => {
  console.log('Generando MedicalRecordPDF con:', { patient, historyCount: history.length, soapCount: soapNotes.length, clinic });

  if (!patient) {
    console.error('Datos de paciente ausentes para MedicalRecordPDF');
    return null;
  }

  const today = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  // Sort history and soap notes by date descending
  const sortedHistory = [...history].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  const sortedSOAP = [...soapNotes].sort((a, b) => b.date.toMillis() - a.date.toMillis());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.clinicInfo}>
            <Text style={styles.clinicName}>{clinic?.name || 'Clínica Veterinaria'}</Text>
            <Text style={styles.value}>Historia Clínica Digital</Text>
          </View>
          <View>
            <Text style={styles.documentTitle}>Resumen de Historia Clínica</Text>
            <Text style={styles.value}>Emitido: {today}</Text>
          </View>
        </View>

        {/* Patient Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Paciente</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>{String(patient.name || 'N/A')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Especie</Text>
              <Text style={styles.value}>{String(patient.species || 'N/A')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Raza</Text>
              <Text style={styles.value}>{String(patient.race || 'N/A')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Edad</Text>
              <Text style={styles.value}>{String(patient.age || 0)} años</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Sexo</Text>
              <Text style={styles.value}>{String(patient.sex || 'N/A')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Propietario</Text>
              <Text style={styles.value}>{String(patient.ownerName || 'N/A')}</Text>
            </View>
          </View>
        </View>

        {/* Clinical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Clínica Base</Text>
          <View style={styles.grid}>
            <View style={[styles.gridItem, { width: '100%' }]}>
              <Text style={styles.label}>Alergias</Text>
              <Text style={[styles.value, { color: patient.allergies ? '#dc2626' : '#333' }]}>
                {patient.allergies || 'Ninguna conocida'}
              </Text>
            </View>
            <View style={[styles.gridItem, { width: '100%' }]}>
              <Text style={styles.label}>Antecedentes Relevantes</Text>
              <Text style={styles.value}>{patient.medicalHistory || 'Sin antecedentes registrados'}</Text>
            </View>
          </View>
        </View>

        {/* SOAP Notes (Most recent first) */}
        {sortedSOAP.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evolución Clínica (Notas SOAP)</Text>
            {sortedSOAP.slice(0, 5).map((note) => (
              <View key={note.id} style={styles.soapCard}>
                <View style={styles.eventHeader}>
                  <Text style={[styles.eventType, { color: '#059669' }]}>Nota de Evolución</Text>
                  <Text style={styles.eventDate}>{format(note.date.toDate(), 'dd/MM/yyyy')}</Text>
                </View>
                <View style={styles.soapAssessment}>
                  <Text style={styles.label}>Diagnóstico / Evaluación</Text>
                  <Text style={[styles.value, { fontWeight: 'bold' }]}>{String(note.assessment || 'Sin evaluación')}</Text>
                </View>
                <View style={styles.soapGrid}>
                  <View style={styles.soapItem}>
                    <Text style={styles.label}>Subjetivo</Text>
                    <Text style={styles.value}>{String(note.subjective || '-')}</Text>
                  </View>
                  <View style={styles.soapItem}>
                    <Text style={styles.label}>Objetivo</Text>
                    <Text style={styles.value}>{String(note.objective || '-')}</Text>
                  </View>
                  <View style={styles.soapItem}>
                    <Text style={styles.label}>Plan</Text>
                    <Text style={styles.value}>{String(note.plan || '-')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Timeline History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Eventos</Text>
          {sortedHistory.length === 0 ? (
            <Text style={styles.value}>No hay eventos registrados.</Text>
          ) : (
            sortedHistory.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventType}>{String(event.type || 'Evento')}</Text>
                  <Text style={styles.eventDate}>{format(event.date.toDate(), 'dd/MM/yyyy')}</Text>
                </View>
                <Text style={styles.eventDescription}>{String(event.description || 'Sin descripción')}</Text>
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Documento generado automáticamente por VCRM</Text>
          <Text style={styles.footerText}>Página 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default MedicalRecordPDF;
