import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, MoreVertical, Edit2, Upload, Download, FileSpreadsheet, ChevronRight, FileText } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { exportProductsToExcel, parseProductsExcel, downloadProductTemplate } from '@/lib/excel';
import { exportProductsToPDF } from '@/lib/pdf';
import { useRef } from 'react';
import ProductForm from './ProductForm';
import type { Product } from '@/types';

export default function Products() {
  const { data, currentTenant, addProduct, updateProduct, deleteProduct } = useCRM();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedProducts = await parseProductsExcel(file);
      if (importedProducts.length === 0) {
        alert("Aucun produit trouvé dans le fichier.");
        return;
      }
      if (confirm(`Vous allez importer ${importedProducts.length} produits. Continuer ?`)) {
        importedProducts.forEach(prod => addProduct(prod as any));
        alert('Importation réussie !');
      }
    } catch (err) {
      alert("Erreur lors de la lecture du fichier Excel.");
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const filtered = (data.products || []).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (prod: Product) => {
    setEditingProduct(prod);
    setIsFormOpen(true);
  };

  const getDisplayPrice = (prod: any) => {
    if (currentTenant && prod.prices && prod.prices[currentTenant] !== undefined) {
      return prod.prices[currentTenant];
    }
    return prod.price;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue</h1>
          <p className="text-gray-500 text-sm mt-0.5">Partagé avec toutes les entités</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Actions <ChevronRight className="w-4 h-4 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-blue-600" />
                Importer Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadProductTemplate} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                Modèle d'importation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportProductsToExcel(data.products || [])} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2 text-green-600" />
                Exporter Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportProductsToPDF(data.products || [], currentTenant)} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-red-600" />
                Exporter PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleAdd} className={`text-white gap-2 ${currentTenant === 'katamine' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(prod => {
            const displayPrice = getDisplayPrice(prod);
            const isCustomPrice = currentTenant && prod.prices && prod.prices[currentTenant] !== undefined;
            const stock = currentTenant && prod.stock ? (prod.stock[currentTenant] || 0) : 0;

            return (
              <Card key={prod.id} className="border border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2">
                    <div className="flex-1 w-full min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{prod.name}</h3>
                        {prod.brand && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {prod.brand}
                          </span>
                        )}
                      </div>
                      {prod.description && <p className="text-sm text-gray-500 mt-1 truncate">{prod.description}</p>}
                      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                        <span>Ajouté le {formatDate(prod.createdAt)}</span>
                        <span>TVA : {prod.vatRate}%</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          En stock : {stock}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center gap-2 justify-start sm:justify-end">
                          <p className="font-bold text-gray-900">{formatCurrency(displayPrice)} <span className="text-[10px] font-normal text-gray-500">HT</span></p>
                          <button onClick={() => handleEdit(prod)} className="text-gray-400 hover:text-gray-900">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className={`font-bold mt-1 ${currentTenant === 'katamine' ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {formatCurrency(displayPrice * (1 + prod.vatRate / 100))} <span className={`text-[10px] font-normal ${currentTenant === 'katamine' ? 'text-blue-400' : 'text-yellow-400'}`}>TTC</span>
                        </p>
                        {!isCustomPrice && (
                          <p className="text-[10px] text-gray-400 mt-1 italic">Prix par défaut</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(prod)}
                          >
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { if (confirm('Supprimer ce produit (de toutes les entités) ?')) deleteProduct(prod.id); }}
                            className="text-red-600"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <ProductForm 
          product={editingProduct} 
          onClose={() => { setIsFormOpen(false); setEditingProduct(undefined); }} 
        />
      )}
    </div>
  );
}
