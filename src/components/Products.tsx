import { useState, useMemo, useRef } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Search, MoreVertical, Edit2, Upload, Download, FileSpreadsheet, ChevronRight, FileText, Filter, TrendingUp, Layers, ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { exportProductsToExcel, parseProductsExcel, downloadProductTemplate } from '@/lib/excel';
import { exportProductsToPDF } from '@/lib/pdf';

import ProductForm from './ProductForm';
import type { Product } from '@/types';

export default function Products() {
  const { data, currentTenant, addProduct, updateProduct, deleteProduct } = useCRM();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'stock' | 'price'; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
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
  
  const filtered = useMemo(() => {
    let result = (data.products || []).filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
    );

    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Product] || '';
        let bVal: any = b[sortConfig.key as keyof Product] || '';
        
        if (sortConfig.key === 'stock') {
          aVal = currentTenant && a.stock ? (a.stock[currentTenant] || 0) : 0;
          bVal = currentTenant && b.stock ? (b.stock[currentTenant] || 0) : 0;
        } else if (sortConfig.key === 'price') {
          aVal = currentTenant && a.prices && a.prices[currentTenant] !== undefined ? a.prices[currentTenant] : a.price;
          bVal = currentTenant && b.prices && b.prices[currentTenant] !== undefined ? b.prices[currentTenant] : b.price;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return result;
  }, [data.products, search, sortConfig, currentTenant]);

  const toggleSort = (key: keyof Product | 'stock' | 'price') => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const kpis = useMemo(() => {
    const products = data.products || [];
    const totalProducts = products.length;
    let stockValue = 0;
    
    if (currentTenant) {
       products.forEach(p => {
         const price = p.prices && p.prices[currentTenant] !== undefined ? p.prices[currentTenant] : p.price;
         const stock = p.stock && p.stock[currentTenant] !== undefined ? p.stock[currentTenant] : 0;
         stockValue += price * stock;
       });
    }

    return { totalProducts, stockValue };
  }, [data.products, currentTenant]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden rounded-2xl relative">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <Package className="w-24 h-24 text-blue-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Produits</p>
              <p className="text-2xl sm:text-4xl font-bold text-blue-900 mt-1 truncate">{kpis.totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden rounded-2xl relative">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <Layers className="w-24 h-24 text-emerald-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Valeur du Stock (HT)</p>
              <p className="text-2xl sm:text-4xl font-bold text-emerald-900 mt-1 truncate">{formatCurrency(kpis.stockValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200/60 shadow-sm overflow-hidden bg-white mt-5">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtres</span>
          </div>
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="pl-9 h-9 w-full bg-white border-gray-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucun produit trouvé</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-4 cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-2">Produit <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('createdAt')}>
                    <div className="flex items-center gap-2">Date d'ajout <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('vatRate')}>
                    <div className="flex items-center gap-2">TVA <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 text-center cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('stock')}>
                    <div className="flex items-center justify-center gap-2">Stock <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 text-right cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('price')}>
                    <div className="flex items-center justify-end gap-2"><ArrowUpDown className="w-3.5 h-3.5 opacity-50" /> Prix HT</div>
                  </th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(prod => {
                  const displayPrice = getDisplayPrice(prod);
                  const isCustomPrice = currentTenant && prod.prices && prod.prices[currentTenant] !== undefined;
                  const stock = currentTenant && prod.stock ? (prod.stock[currentTenant] || 0) : 0;

                  return (
                    <tr 
                      key={prod.id} 
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(prod)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{prod.name}</span>
                            {prod.brand && (
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {prod.brand}
                              </span>
                            )}
                          </div>
                          {prod.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{prod.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {formatDate(prod.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {prod.vatRate}%
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full font-bold ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {stock} en stock
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <p className="font-bold text-gray-900">{formatCurrency(displayPrice)}</p>
                          {!isCustomPrice && (
                            <p className="text-[10px] text-gray-400 mt-0.5 italic">Défaut</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 items-center opacity-80 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(prod)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => { if (confirm('Supprimer ce produit (de toutes les entités) ?')) deleteProduct(prod.id); }}
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                              >
                                <FileText className="w-4 h-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {isFormOpen && (
        <ProductForm 
          product={editingProduct} 
          onClose={() => { setIsFormOpen(false); setEditingProduct(undefined); }} 
        />
      )}
    </div>
  );
}
