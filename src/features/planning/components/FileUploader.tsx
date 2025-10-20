import { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UploadedFile {
  name: string;
  path: string;
  type: 'teachers' | 'wishes' | 'exams';
}

interface FileUploaderProps {
  onFilesChange: (files: { teachers?: string; wishes?: string; exams?: string }) => void;
}

export function FileUploader({ onFilesChange }: FileUploaderProps) {
  const [files, setFiles] = useState<{
    teachers?: UploadedFile;
    wishes?: UploadedFile;
    exams?: UploadedFile;
  }>({});

  const handleSelectFile = async (fileType: 'teachers' | 'wishes' | 'exams') => {
    try {
      const filePath = await (window as any).electronAPI.selectFile(fileType);

      if (filePath) {
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
        const newFile: UploadedFile = {
          name: fileName,
          path: filePath,
          type: fileType
        };

        setFiles(prev => ({
          ...prev,
          [fileType]: newFile
        }));

        // Notifier le parent
        onFilesChange({
          teachers: files.teachers?.path,
          wishes: files.wishes?.path,
          exams: files.exams?.path,
          [fileType]: filePath
        });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleRemoveFile = (fileType: 'teachers' | 'wishes' | 'exams') => {
    setFiles(prev => {
      const updated = { ...prev };
      delete updated[fileType];
      return updated;
    });

    onFilesChange({
      teachers: files.teachers?.path,
      wishes: files.wishes?.path,
      exams: files.exams?.path,
      [fileType]: undefined
    });
  };

  const fileConfigs = [
    {
      type: 'teachers' as const,
      label: 'Fichier Enseignants',
      description: 'Liste des enseignants participants',
      required: true
    },
    {
      type: 'wishes' as const,
      label: 'Fichier Souhaits',
      description: 'Contraintes de disponibilité',
      required: true
    },
    {
      type: 'exams' as const,
      label: 'Fichier Examens',
      description: 'Planning des examens',
      required: true
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Fichiers d'entrée</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez les 3 fichiers Excel nécessaires pour générer le planning
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {fileConfigs.map(config => (
          <Card key={config.type} className="p-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {config.label}
                  {config.required && <span className="text-destructive text-sm">*</span>}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {config.description}
                </p>
              </div>

              {files[config.type] ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                      {files[config.type]!.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(config.type)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSelectFile(config.type)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Sélectionner
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {files.teachers && files.wishes && files.exams && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Tous les fichiers sont prêts ! Vous pouvez lancer la génération.
          </p>
        </div>
      )}
    </div>
  );
}