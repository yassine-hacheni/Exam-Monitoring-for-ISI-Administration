import {  FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExportButtonsProps {
  disabled?: boolean;
}

export function ExportButtons({ disabled = false }: ExportButtonsProps) {
  const handleExportExcel = async () => {
    try {
      const result = await (window as any).electronAPI.saveResultsFile();

      if (result.success) {
        toast.success('Fichier exporté avec succès', {
          description: `Sauvegardé dans: ${result.path}`
        });
      } else {
        toast.error('Erreur lors de l\'export', {
          description: result.error
        });
      }
    } catch (error) {
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleExportExcel}
        disabled={disabled}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Télécharger Excel
      </Button>
    </div>
  );
}