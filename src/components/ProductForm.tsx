import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Product } from '@/types';

interface ProductFormProps {
  onClose: () => void;
  product?: Product;
}

export default function ProductForm({ onClose, product }: ProductFormProps) {
  const { currentTenant, addProduct, updateProduct } = useCRM();

  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [description, setDescription] = useState(product?.description || '');
  const [basePrice, setBasePrice] = useState(product?.price || 0);
  const [purchasePrice, setPurchasePrice] = useState<string | number>(product?.purchasePrice || '');
  const [vatRate, setVatRate] = useState(product?.vatRate || 19);

  // Tenant-specific price
  const initialTenantPrice = (currentTenant && product?.prices && product.prices[currentTenant]) !== undefined 
    ? product!.prices![currentTenant] 
    : '';
  const [tenantPrice, setTenantPrice] = useState<string | number>(initialTenantPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPrices = { ...(product?.prices || {}) };
    if (currentTenant && tenantPrice !== '') {
      newPrices[currentTenant] = Number(tenantPrice);
    } else if (currentTenant && tenantPrice === '') {
      delete newPrices[currentTenant];
    }

    const data: Partial<Product> = {
      name,
      brand,
      description,
      price: basePrice,
      purchasePrice: purchasePrice !== '' ? Number(purchasePrice) : undefined,
      vatRate,
      prices: newPrices
    };

    if (product) {
      updateProduct(product.id, data);
    } else {
      addProduct(data as Product);
    }

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label>Nom du produit/service *</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>
          
          <div>
            <Label>Marque</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} className="mt-1" placeholder="Ex: Bosch, Makita..." />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prix de Vente HT *</Label>
              <Input type="number" step="0.01" required min="0" value={basePrice} onChange={e => setBasePrice(parseFloat(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label>Prix d'Achat HT (Optionnel)</Label>
              <Input type="number" step="0.01" min="0" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>TVA (%) *</Label>
            <Input type="number" required min="0" max="100" value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))} className="mt-1" />
          </div>

          {currentTenant && (
            <div className="pt-2 border-t">
              <Label>Prix spécifique pour {currentTenant === 'katamine' ? 'Katamine' : 'KL Tools'} HT (Optionnel)</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                value={tenantPrice} 
                onChange={e => setTenantPrice(e.target.value)} 
                className="mt-1" 
                placeholder="Laissez vide pour utiliser le prix de base"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className={currentTenant === 'kltools' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}>
              {product ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
