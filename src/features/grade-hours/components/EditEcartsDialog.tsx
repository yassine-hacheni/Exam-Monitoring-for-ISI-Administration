import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ecarts } from '../types'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EditEcartsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEcarts: Ecarts
  onConfirm: (newEcarts: Ecarts) => void
}

export function EditEcartsDialog({
  open,
  onOpenChange,
  currentEcarts,
  onConfirm,
}: EditEcartsDialogProps) {
  const [ecart1_2, setEcart1_2] = useState<string>(currentEcarts.ecart_1_2.toString())
  const [ecart2_3, setEcart2_3] = useState<string>(currentEcarts.ecart_2_3.toString())
  const [ecart3_4, setEcart3_4] = useState<string>(currentEcarts.ecart_3_4.toString())
  const [error, setError] = useState<string>('')

  // Réinitialiser les valeurs quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      setEcart1_2(currentEcarts.ecart_1_2.toString())
      setEcart2_3(currentEcarts.ecart_2_3.toString())
      setEcart3_4(currentEcarts.ecart_3_4.toString())
      setError('')
    }
  }, [open, currentEcarts])

  const validateAndConfirm = () => {
    const e1 = parseFloat(ecart1_2)
    const e2 = parseFloat(ecart2_3)
    const e3 = parseFloat(ecart3_4)

    console.log('🔍 Validating ecarts:', { e1, e2, e3 })

    // Validation
    if (isNaN(e1) || isNaN(e2) || isNaN(e3)) {
      setError('Tous les écarts doivent être des nombres valides')
      return
    }

    if (e1 < 0 || e2 < 0 || e3 < 0) {
      setError('Les écarts ne peuvent pas être négatifs')
      return
    }

    if (e1 > 10 || e2 > 10 || e3 > 10) {
      setError('Les écarts ne peuvent pas dépasser 10 surveillances')
      return
    }

    // Confirmer
    const newEcarts = {
      ecart_1_2: e1,
      ecart_2_3: e2,
      ecart_3_4: e3,
    }
    console.log('✅ Calling onConfirm with:', newEcarts)
    onConfirm(newEcarts)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Modifier les Écarts entre Grades</DialogTitle>
          <DialogDescription>
            Ajustez les écarts de surveillances entre les niveaux hiérarchiques.
            Chaque écart représente le nombre de surveillances supplémentaires.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className='space-y-2'>
            <Label htmlFor='ecart1_2'>
              Écart Niveau 1 → 2 (PR/MC/V → MA)
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                id='ecart1_2'
                type='number'
                step='0.1'
                min='0'
                max='10'
                value={ecart1_2}
                onChange={(e) => setEcart1_2(e.target.value)}
                className='flex-1'
              />
              <span className='text-sm text-muted-foreground'>surveillances</span>
            </div>
            <p className='text-xs text-muted-foreground'>
              Nombre de surveillances supplémentaires pour les MA par rapport aux PR/MC/V
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='ecart2_3'>
              Écart Niveau 2 → 3 (MA → AS)
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                id='ecart2_3'
                type='number'
                step='0.1'
                min='0'
                max='10'
                value={ecart2_3}
                onChange={(e) => setEcart2_3(e.target.value)}
                className='flex-1'
              />
              <span className='text-sm text-muted-foreground'>surveillances</span>
            </div>
            <p className='text-xs text-muted-foreground'>
              Nombre de surveillances supplémentaires pour les AS par rapport aux MA
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='ecart3_4'>
              Écart Niveau 3 → 4 (AS → AC/PES/PTC)
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                id='ecart3_4'
                type='number'
                step='0.1'
                min='0'
                max='10'
                value={ecart3_4}
                onChange={(e) => setEcart3_4(e.target.value)}
                className='flex-1'
              />
              <span className='text-sm text-muted-foreground'>surveillances</span>
            </div>
            <p className='text-xs text-muted-foreground'>
              Nombre de surveillances supplémentaires pour les AC/PES/PTC par rapport aux AS
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={validateAndConfirm}>
            Appliquer et Régénérer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
