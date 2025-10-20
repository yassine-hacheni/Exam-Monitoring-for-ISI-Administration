import { Calendar, Table, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'calendar' | 'table' | 'teacher';
  onViewChange: (view: 'calendar' | 'table' | 'teacher') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={view === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('calendar')}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        Calendrier
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="gap-2"
      >
        <Table className="h-4 w-4" />
        Tableau
      </Button>
      <Button
        variant={view === 'teacher' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('teacher')}
        className="gap-2"
      >
        <User className="h-4 w-4" />
        Enseignant
      </Button>
    </div>
  );
}