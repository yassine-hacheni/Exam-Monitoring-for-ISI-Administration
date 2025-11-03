import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FileInfo {
  name: string
  path: string
  size: number
}

interface FileUploadStepProps {
  onFilesUploaded: (data: { professorsFile: string; planningFile: string }) => void
  isLoading?: boolean
}

export function FileUploadStep({ onFilesUploaded, isLoading }: FileUploadStepProps) {
  const [professorsFile, setProfessorsFile] = useState<FileInfo | null>(null)
  const [planningFile, setPlanningFile] = useState<FileInfo | null>(null)
  const [dragOver, setDragOver] = useState<'professors' | 'planning' | null>(null)

  const handleFileSelect = async (type: 'professors' | 'planning') => {
    try {
      const filePath = await window.electronAPI.selectFile('excel')
      if (filePath) {
        // Extraire le nom du fichier et obtenir la taille
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'fichier.xlsx'
        const fileInfo: FileInfo = {
          name: fileName,
          path: filePath,
          size: 0 // La taille sera affichée comme "N/A" ou on peut la calculer
        }
        
        if (type === 'professors') {
          setProfessorsFile(fileInfo)
        } else {
          setPlanningFile(fileInfo)
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error)
    }
  }

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    _type: 'professors' | 'planning'
  ) => {
    e.preventDefault()
    setDragOver(null)
    // Dans Electron, le drag & drop de fichiers nécessite une configuration spéciale
    // Pour l'instant, on utilise uniquement le bouton de sélection
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    type: 'professors' | 'planning'
  ) => {
    e.preventDefault()
    setDragOver(type)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(null)
  }

  const removeFile = (type: 'professors' | 'planning') => {
    if (type === 'professors') {
      setProfessorsFile(null)
    } else {
      setPlanningFile(null)
    }
  }

  const handleContinue = () => {
    if (professorsFile && planningFile) {
      onFilesUploaded({ 
        professorsFile: professorsFile.path, 
        planningFile: planningFile.path 
      })
    }
  }

  return (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='professors-file' className='text-base font-semibold'>
            Fichier des Professeurs Participants
          </Label>
          <p className='text-sm text-muted-foreground'>
            Importez le fichier Excel contenant la liste des professeurs participants
          </p>
        </div>

        <Card
          className={cn(
            'relative border-2 border-dashed transition-colors',
            dragOver === 'professors' && 'border-primary bg-primary/5',
            professorsFile && 'border-green-500 bg-green-50 dark:bg-green-950/20'
          )}
          onDrop={(e) => handleDrop(e, 'professors')}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'professors')}
          onDragLeave={handleDragLeave}
        >
          <div className='p-8'>
            {professorsFile ? (
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-green-100 p-2 dark:bg-green-900'>
                    <CheckCircle2 className='h-6 w-6 text-green-600 dark:text-green-400' />
                  </div>
                  <div>
                    <p className='font-medium'>{professorsFile.name}</p>
                    <p className='text-sm text-muted-foreground'>
                      Fichier sélectionné
                    </p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => removeFile('professors')}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-4 text-center'>
                <div className='rounded-lg bg-muted p-3'>
                  <Upload className='h-8 w-8 text-muted-foreground' />
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>
                    Glissez-déposez votre fichier Excel ici
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    ou cliquez pour parcourir vos fichiers
                  </p>
                </div>
                <Button
                  variant='outline'
                  onClick={() => handleFileSelect('professors')}
                >
                  <FileSpreadsheet className='mr-2 h-4 w-4' />
                  Sélectionner un fichier
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='planning-file' className='text-base font-semibold'>
            Planning des Examens
          </Label>
          <p className='text-sm text-muted-foreground'>
            Importez le fichier Excel contenant le planning des examens
          </p>
        </div>

        <Card
          className={cn(
            'relative border-2 border-dashed transition-colors',
            dragOver === 'planning' && 'border-primary bg-primary/5',
            planningFile && 'border-green-500 bg-green-50 dark:bg-green-950/20'
          )}
          onDrop={(e) => handleDrop(e, 'planning')}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'planning')}
          onDragLeave={handleDragLeave}
        >
          <div className='p-8'>
            {planningFile ? (
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-green-100 p-2 dark:bg-green-900'>
                    <CheckCircle2 className='h-6 w-6 text-green-600 dark:text-green-400' />
                  </div>
                  <div>
                    <p className='font-medium'>{planningFile.name}</p>
                    <p className='text-sm text-muted-foreground'>
                      Fichier sélectionné
                    </p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => removeFile('planning')}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-4 text-center'>
                <div className='rounded-lg bg-muted p-3'>
                  <Upload className='h-8 w-8 text-muted-foreground' />
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>
                    Glissez-déposez votre fichier Excel ici
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    ou cliquez pour parcourir vos fichiers
                  </p>
                </div>
                <Button
                  variant='outline'
                  onClick={() => handleFileSelect('planning')}
                >
                  <FileSpreadsheet className='mr-2 h-4 w-4' />
                  Sélectionner un fichier
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className='flex justify-end pt-4'>
        <Button
          size='lg'
          onClick={handleContinue}
          disabled={!professorsFile || !planningFile || isLoading}
        >
          {isLoading ? 'Génération en cours...' : 'Générer l\'Algorithme'}
        </Button>
      </div>
    </div>
  )
}
