import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Edit2,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { cn } from '../lib/utils';
import { InventoryItem } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { logActivity } from '../lib/firestore-utils';

const InventoryView: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    stock: 0,
    minStock: 5,
    unit: 'unidades'
  });
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'inventory'),
      where('clinicId', '==', profile.clinicId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });

    return () => unsubscribe();
  }, [profile]);

  const handleAddItem = async () => {
    if (!profile || !newItem.name) return;

    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        clinicId: profile.clinicId,
        updatedAt: Timestamp.now(),
      });
      
      await logActivity({
        type: 'inventory',
        description: `Agregó "${newItem.name}" al inventario`,
        clinicId: profile.clinicId
      });

      setIsAddDialogOpen(false);
      setNewItem({ name: '', stock: 0, minStock: 5, unit: 'unidades' });
      toast.success('Producto agregado.');
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar producto.');
    }
  };

  const handleUpdateStock = async (item: InventoryItem, amount: number) => {
    try {
      const newStock = Math.max(0, item.stock + amount);
      await updateDoc(doc(db, 'inventory', item.id), {
        stock: newStock,
        updatedAt: Timestamp.now()
      });

      await logActivity({
        type: 'inventory',
        description: `Actualizó stock de "${item.name}": ${item.stock} -> ${newStock}`,
        clinicId: profile.clinicId
      });

      if (newStock <= item.minStock) {
        toast.warning(`Stock bajo: ${item.name} (${newStock} ${item.unit})`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar stock.');
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
      toast.success('Producto eliminado.');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar.');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Inventario
          </h2>
          <p className="text-muted-foreground font-medium">Gestiona medicamentos, insumos y stock de tu clínica.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl h-12 px-6 shadow-lg shadow-primary/20 font-bold">
              <Plus className="w-5 h-5" /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glass border-none shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Agregar al Inventario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre del Producto</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Amoxicilina 500mg" 
                  className="rounded-xl h-11 glass dark:glass-dark border-none shadow-sm focus:shadow-md transition-all"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Stock Inicial</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    className="rounded-xl h-11 glass dark:glass-dark border-none shadow-sm focus:shadow-md transition-all"
                    value={newItem.stock}
                    onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Stock Mínimo</Label>
                  <Input 
                    id="minStock" 
                    type="number" 
                    className="rounded-xl h-11 glass dark:glass-dark border-none shadow-sm focus:shadow-md transition-all"
                    value={newItem.minStock}
                    onChange={e => setNewItem({...newItem, minStock: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unidad</Label>
                <Input 
                  id="unit" 
                  placeholder="Ej: unidades, frascos, cajas" 
                  className="rounded-xl h-11 glass dark:glass-dark border-none shadow-sm focus:shadow-md transition-all"
                  value={newItem.unit}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold">Cancelar</Button>
              <Button onClick={handleAddItem} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20">Guardar Producto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Buscar productos por nombre..." 
          className="pl-10 h-12 rounded-xl border-border bg-card shadow-sm focus:shadow-md transition-all max-w-md"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className={cn(
            "border border-border rounded-3xl shadow-xl overflow-hidden group transition-all duration-500 hover:-translate-y-1",
            item.stock <= item.minStock ? "ring-2 ring-destructive/20" : ""
          )}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform",
                    item.stock <= item.minStock ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  )}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{item.unit}</p>
                  </div>
                </div>
                {item.stock <= item.minStock && (
                  <Badge variant="destructive" className="gap-1 rounded-full px-3 py-0.5 font-black uppercase text-[10px] animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Stock Bajo
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-muted/30 dark:bg-white/5 p-4 rounded-2xl mb-6 border border-primary/5">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Actual</p>
                  <p className={cn(
                    "text-3xl font-black",
                    item.stock <= item.minStock ? "text-destructive" : "text-foreground"
                  )}>{item.stock}</p>
                </div>
                <div className="text-center border-l border-primary/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Mínimo</p>
                  <p className="text-3xl font-black text-muted-foreground/50">{item.minStock}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2 rounded-xl h-10 font-bold border-primary/10 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all"
                  onClick={() => handleUpdateStock(item, -1)}
                >
                  <ArrowDownCircle className="w-4 h-4" /> Salida
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2 rounded-xl h-10 font-bold border-primary/10 hover:bg-emerald-500/5 hover:text-emerald-500 hover:border-emerald-500/20 transition-all"
                  onClick={() => handleUpdateStock(item, 1)}
                >
                  <ArrowUpCircle className="w-4 h-4" /> Entrada
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                  onClick={() => handleDeleteItem(item.id, item.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InventoryView;
