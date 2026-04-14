import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Patient, Prescription, Clinic } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Use standard fonts to avoid loading issues
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  clinicInfo: {
    flexDirection: 'column',
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    textTransform: 'uppercase',
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1d4ed8',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  gridItem: {
    width: '50%',
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
  },
  prescriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    border: 1,
    borderColor: '#e2e8f0',
  },
  medicationName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e293b',
  },
  prescriptionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  prescriptionItem: {
    flex: 1,
  },
  notes: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  signature: {
    marginTop: 50,
    alignSelf: 'flex-end',
    width: 200,
    borderTop: 1,
    borderTopColor: '#333',
    textAlign: 'center',
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  }
});

interface PrescriptionPDFProps {
  prescription: Prescription;
  patient: Patient;
  clinic: Clinic | null;
  vetName?: string;
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ prescription, patient, clinic, vetName }) => {
  console.log('Generando PrescriptionPDF con:', { prescription, patient, clinic, vetName });
  
  if (!prescription || !patient) {
    console.error('Datos insuficientes para generar PrescriptionPDF');
    return null;
  }

  const dateStr = format(prescription.date.toDate(), "d 'de' MMMM, yyyy", { locale: es });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.clinicInfo}>
            <Text style={styles.clinicName}>{clinic?.name || 'Clínica Veterinaria'}</Text>
            <Text style={styles.value}>VCRM Management System</Text>
          </View>
          <View>
            <Text style={styles.documentTitle}>Receta Médica</Text>
            <Text style={styles.value}>Fecha: {dateStr}</Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Paciente</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Paciente</Text>
              <Text style={styles.value}>{String(patient.name || 'N/A')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Especie / Raza</Text>
              <Text style={styles.value}>{String(patient.species || 'N/A')} {patient.race ? `• ${patient.race}` : ''}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Edad</Text>
              <Text style={styles.value}>{String(patient.age || 0)} años</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Propietario</Text>
              <Text style={styles.value}>{String(patient.ownerName || 'N/A')}</Text>
            </View>
          </View>
        </View>

        {/* Prescription Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescripción</Text>
          <View style={styles.prescriptionBox}>
            <Text style={styles.medicationName}>{String(prescription.medication || 'Medicamento')}</Text>
            
            <View style={styles.prescriptionGrid}>
              <View style={styles.prescriptionItem}>
                <Text style={styles.label}>Dosis</Text>
                <Text style={styles.value}>{String(prescription.dose || '-')}</Text>
              </View>
              <View style={styles.prescriptionItem}>
                <Text style={styles.label}>Frecuencia</Text>
                <Text style={styles.value}>{String(prescription.frequency || '-')}</Text>
              </View>
              <View style={styles.prescriptionItem}>
                <Text style={styles.label}>Duración</Text>
                <Text style={styles.value}>{String(prescription.duration || '-')}</Text>
              </View>
            </View>

            {prescription.notes && (
              <View style={styles.notes}>
                <Text style={styles.label}>Indicaciones Adicionales</Text>
                <Text style={styles.value}>{prescription.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <Text style={styles.value}>{vetName || 'Médico Veterinario'}</Text>
          <Text style={styles.signatureLabel}>Firma y Sello</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generado por VCRM - {clinic?.name || 'Veterinaria'}</Text>
          <Text style={styles.footerText}>Página 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;
