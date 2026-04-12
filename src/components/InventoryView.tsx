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
    if (!confirm(`¿Eliminar "${name}" del inventario?`)) return;
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventario</h2>
          <p className="text-muted-foreground">Gestiona medicamentos, insumos y stock de tu clínica.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Agregar al Inventario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Amoxicilina 500mg" 
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Inicial</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    value={newItem.stock}
                    onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock Mínimo</Label>
                  <Input 
                    id="minStock" 
                    type="number" 
                    value={newItem.minStock}
                    onChange={e => setNewItem({...newItem, minStock: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                <Input 
                  id="unit" 
                  placeholder="Ej: unidades, frascos, cajas" 
                  value={newItem.unit}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddItem}>Guardar Producto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar productos..." 
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className={item.stock <= item.minStock ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{item.unit}</p>
                </div>
                {item.stock <= item.minStock && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Stock Bajo
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg mb-4">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Actual</p>
                  <p className="text-2xl font-bold">{item.stock}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Mínimo</p>
                  <p className="text-2xl font-bold text-muted-foreground">{item.minStock}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => handleUpdateStock(item, -1)}
                >
                  <ArrowDownCircle className="w-4 h-4" /> Salida
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => handleUpdateStock(item, 1)}
                >
                  <ArrowUpCircle className="w-4 h-4" /> Entrada
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
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
