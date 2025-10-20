import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProcessingStatusProps {
  isProcessing: boolean;
  result: {
    success: boolean;
    error?: string;
    outputFile?: string;
  } | null;
}

export function ProcessingStatus({ isProcessing, result }: ProcessingStatusProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // Écouter les logs Python
      (window as any).electronAPI.onPythonLog((log: string) => {
        setLogs(prev => [...prev, log]);
      });

      (window as any).electronAPI.onPythonError((error: string) => {
        setLogs(prev => [...prev, `❌ ERROR: ${error}`]);
      });
    }
  }, []);

  useEffect(() => {
    if (!isProcessing) {
      // Réinitialiser les logs après un délai
      const timer = setTimeout(() => {
        if (result?.success) {
          setLogs([]);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, result]);

  if (!isProcessing && !result) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* En-tête du statut */}
        <div className="flex items-center gap-3">
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <h3 className="font-semibold">Génération en cours...</h3>
                <p className="text-sm text-muted-foreground">
                  L'algorithme d'optimisation est en train de calculer le planning
                </p>
              </div>
            </>
          ) : result?.success ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Génération terminée avec succès !
                </h3>
                <p className="text-sm text-muted-foreground">
                  Le planning a été généré et optimisé
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Erreur lors de la génération</h3>
                <p className="text-sm text-muted-foreground">
                  {result?.error || 'Une erreur est survenue'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Logs Python */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Logs d'exécution
            </div>
            <ScrollArea className="h-64 w-full rounded-md border bg-slate-950 p-4">
              <pre className="text-xs text-green-400 font-mono">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
}