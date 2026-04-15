import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  User, 
  Phone, 
  Dog, 
  Loader2, 
  Command as CommandIcon,
  X
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { Patient } from '../types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  onSelectPatient: (patient: Patient) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectPatient }) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{ patients: Patient[], owners: Patient[] }>({ patients: [], owners: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard shortcut to open search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const performSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2 || !profile) {
      setResults({ patients: [], owners: [] });
      return;
    }

    setIsLoading(true);
    console.log('🔍 Iniciando búsqueda global para:', term);

    try {
      const clinicId = profile.clinicId;
      const termLower = term.toLowerCase();
      
      const patientsRef = collection(db, 'patients');
      
      // 1. Búsqueda por prefijo en Nombre (Rápida y precisa)
      const qName = query(
        patientsRef,
        where('clinicId', '==', clinicId),
        orderBy('name'),
        where('name', '>=', term),
        where('name', '<=', term + '\uf8ff'),
        limit(20)
      );

      // 2. Búsqueda por palabras clave (Deep Search)
      const qKeywords = query(
        patientsRef,
        where('clinicId', '==', clinicId),
        where('searchKeywords', 'array-contains', termLower),
        limit(50)
      );

      const [nameSnap, keywordsSnap] = await Promise.all([
        getDocs(qName),
        getDocs(qKeywords)
      ]);

      const nameResults = nameSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      const keywordResults = keywordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));

      // 3. Fallback: Traer documentos recientes para filtrado local (soporta texto parcial en medio de palabras)
      let querySnapshot;
      try {
        const q = query(
          patientsRef,
          where('clinicId', '==', clinicId),
          orderBy('createdAt', 'desc'),
          limit(200) // Aumentamos el límite para búsqueda más profunda
        );
        querySnapshot = await getDocs(q);
      } catch (err) {
        console.warn('⚠️ Fallback: Query con orderBy falló. Reintentando sin orden.');
        const qSimple = query(
          patientsRef,
          where('clinicId', '==', clinicId),
          limit(200)
        );
        querySnapshot = await getDocs(qSimple);
      }

      const allDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      
      // Combinar y de-duplicar
      const combinedDocs = Array.from(new Map([...nameResults, ...keywordResults, ...allDocs].map(p => [p.id, p])).values());
      
      const getMatchSource = (p: Patient, term: string): string | null => {
        const t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const patientName = p.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ownerName = p.ownerName?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if (patientName?.includes(t)) return null; 
        if (ownerName?.includes(t)) return "Dueño";
        if (p.ownerPhone?.includes(t)) return "Teléfono";
        
        // Revisar otros campos del paciente
        if (p.species?.toLowerCase().includes(t)) return "Especie";
        if (p.race?.toLowerCase().includes(t)) return "Raza";
        if (p.observations?.toLowerCase().includes(t)) return "Observaciones";
        if (p.allergies?.toLowerCase().includes(t)) return "Alergias";
        if (p.medicalHistory?.toLowerCase().includes(t)) return "Historial";
        if (p.currentMedication?.toLowerCase().includes(t)) return "Medicación Actual";
        
        // Si no es ninguno de los anteriores, debe venir de la ficha médica (subcolecciones)
        return "Ficha Médica / Receta";
      };

      const filteredPatients = combinedDocs
        .filter(p => 
          p.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termLower) ||
          p.searchKeywords?.some(kw => kw.includes(termLower)) ||
          p.observations?.toLowerCase().includes(termLower) ||
          p.medicalHistory?.toLowerCase().includes(termLower) ||
          p.currentMedication?.toLowerCase().includes(termLower)
        )
        .map(p => ({ ...p, _matchSource: getMatchSource(p, termLower) }));

      const filteredOwners = combinedDocs
        .filter(p => 
          (p.ownerName?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termLower) || 
           p.ownerPhone?.includes(term) ||
           p.searchKeywords?.some(kw => kw.includes(termLower))) &&
          !filteredPatients.some(fp => fp.id === p.id)
        )
        .map(p => ({ ...p, _matchSource: getMatchSource(p, termLower) }));

      console.log(`✅ Resultados encontrados - Pacientes: ${filteredPatients.length}, Dueños: ${filteredOwners.length}`);

      setResults({
        patients: filteredPatients.slice(0, 10),
        owners: filteredOwners.slice(0, 10)
      });
    } catch (error) {
      console.error('❌ Error en búsqueda global:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, performSearch]);

  const handleSelect = (patient: Patient) => {
    onSelectPatient(patient);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full justify-start gap-3 rounded-xl h-11 px-4 border-border bg-muted/30 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all group"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4 opacity-70 group-hover:scale-110 transition-transform" />
        <span className="flex-1 text-left font-bold">Buscar...</span>
        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] glass">
          <DialogHeader className="p-6 pb-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
              <Input 
                placeholder="Buscar paciente, dueño o teléfono..." 
                className="pl-12 h-14 bg-muted/50 border-none rounded-2xl text-lg font-bold focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] p-6 pt-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Buscando en clínica...</p>
              </div>
            ) : searchTerm.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center">
                  <CommandIcon className="w-8 h-8 text-primary/30" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-muted-foreground">Escribe al menos 2 caracteres</p>
                  <p className="text-xs text-muted-foreground/60">Busca por nombre de mascota, dueño o teléfono.</p>
                </div>
              </div>
            ) : results.patients.length === 0 && results.owners.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-destructive/5 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-destructive/30" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-muted-foreground">Sin resultados para "{searchTerm}"</p>
                  <p className="text-xs text-muted-foreground/60">Intenta con otros términos o revisa la ortografía.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {results.patients.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 px-2">Pacientes</h3>
                    <div className="grid gap-2">
                      {results.patients.map((patient) => (
                        <button
                          key={patient.id}
                          className="flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-all text-left group border border-transparent hover:border-primary/10"
                          onClick={() => handleSelect(patient)}
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Dog className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm truncate">{patient.name}</p>
                              {(patient as any)._matchSource && (
                                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase bg-primary/5 text-primary border-none">
                                  {(patient as any)._matchSource}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                              {patient.species} • {patient.race || 'Sin raza'}
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary/70">
                            Ver Detalle
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {results.owners.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 px-2">Dueños / Teléfonos</h3>
                    <div className="grid gap-2">
                      {results.owners.map((patient) => (
                        <button
                          key={patient.id}
                          className="flex items-center gap-4 p-3 rounded-2xl hover:bg-indigo-500/5 transition-all text-left group border border-transparent hover:border-indigo-500/10"
                          onClick={() => handleSelect(patient)}
                        >
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm truncate">{patient.ownerName}</p>
                              {(patient as any)._matchSource && (
                                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase bg-indigo-500/5 text-indigo-500 border-none">
                                  {(patient as any)._matchSource}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                              <Phone className="w-3 h-3" /> {patient.ownerPhone || 'Sin teléfono'}
                              <span className="opacity-30">•</span>
                              Mascota: {patient.name}
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-widest border-indigo-500/20 text-indigo-500/70">
                            Ver Detalle
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><kbd className="bg-background px-1 rounded border">↑↓</kbd> Navegar</span>
              <span className="flex items-center gap-1"><kbd className="bg-background px-1 rounded border">↵</kbd> Seleccionar</span>
            </div>
            <span>ESC para cerrar</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
