import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PrintOptions } from '@/lib/pdf';
import { FileText } from 'lucide-react';

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: PrintOptions) => void;
  title?: string;
}

export function PrintOptionsModal({ isOpen, onClose, onConfirm, title = "Options d'impression" }: PrintOptionsModalProps) {
  const [options, setOptions] = useState<PrintOptions>({
    annule: false,
    retour: false,
    complement: false,
    duplicata: false,
  });

  const handleConfirm = () => {
    onConfirm(options);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Ces options modifieront uniquement l'affichage sur le PDF généré.
          </p>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="print-annule" 
              checked={options.annule}
              onCheckedChange={(checked) => setOptions({ ...options, annule: checked === true })}
            />
            <label htmlFor="print-annule" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Pièce Annulée
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="print-retour" 
              checked={options.retour}
              onCheckedChange={(checked) => setOptions({ ...options, retour: checked === true })}
            />
            <label htmlFor="print-retour" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Retour
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="print-complement" 
              checked={options.complement}
              onCheckedChange={(checked) => setOptions({ ...options, complement: checked === true })}
            />
            <label htmlFor="print-complement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Pièce Complément
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="print-duplicata" 
              checked={options.duplicata}
              onCheckedChange={(checked) => setOptions({ ...options, duplicata: checked === true })}
            />
            <label htmlFor="print-duplicata" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Pièce Duplicata
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
            Générer le PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
