import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface ExportCalendarButtonProps {
  disabled?: boolean;
}

export function ExportCalendarButton({ disabled = false }: ExportCalendarButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportDocuments = async () => {
    setIsGenerating(true);

    try {
      const result = await (window as any).electronAPI.generateGlobalDocuments();

      if (result.success) {
        toast.success('Documents générés avec succès !', {
          description: `documents créés dans le fichier ZIP`,
          action: {
            label: 'Ouvrir',
            onClick: async () => {
              await (window as any).electronAPI.openFile(result.zip_path);
            }
          },
          duration: 10000
        });
      } else {
        toast.error('Erreur lors de la génération', {
          description: result.error
        });
      }
    } catch (error) {
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExportDocuments}
      disabled={disabled || isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Export Docs Calendrier
        </>
      )}
    </Button>
  );
}