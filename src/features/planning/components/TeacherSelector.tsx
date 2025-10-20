import { useState, useMemo } from 'react';
import { Search, User, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PlanningRow {
  Date: string;
  Jour: number;
  Séance: string;
  Heure_Début: string;
  Heure_Fin: string;
  Nombre_Examens: number;
  Enseignant_ID: string;
  Nom: string;              // ✅ Nouveau
  Prénom: string;           // ✅ Nouveau
  Email: string;            // ✅ Nouveau
  Grade: string;
  Responsable: string;
}

interface TeacherSelectorProps {
  data: PlanningRow[];
  onTeacherSelect: (teacherId: string) => void;
  selectedTeacherId?: string;
}

export function TeacherSelector({ data, onTeacherSelect, selectedTeacherId }: TeacherSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Extraire tous les enseignants uniques avec leurs stats
  const teachers = useMemo(() => {
    const teacherMap = new Map<string, {
      id: string;
      firstName: string;      // ✅ Nouveau
      lastName: string;       // ✅ Nouveau
      email: string;          // ✅ Nouveau
      grade: string;
      assignmentCount: number;
      isResponsible: boolean;
      examCount: number;
    }>();

    data.forEach(row => {
      if (!teacherMap.has(row.Enseignant_ID)) {
        teacherMap.set(row.Enseignant_ID, {
          id: row.Enseignant_ID,
          firstName: row.Prénom || '',        // ✅ Nouveau
          lastName: row.Nom || '',            // ✅ Nouveau
          email: row.Email || '',             // ✅ Nouveau
          grade: row.Grade,
          assignmentCount: 1,
          isResponsible: row.Responsable === 'OUI',
          examCount: row.Nombre_Examens || 0
        });
      } else {
        const teacher = teacherMap.get(row.Enseignant_ID)!;
        teacher.assignmentCount++;
        teacher.examCount += (row.Nombre_Examens || 0);
        if (row.Responsable === 'OUI') {
          teacher.isResponsible = true;
        }
      }
    });

    return Array.from(teacherMap.values()).sort((a, b) => {
      // Tri par nom de famille, puis prénom
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [data]);

  const filteredTeachers = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return teachers.filter(teacher =>
      teacher.id.toLowerCase().includes(searchLower) ||
      teacher.grade.toLowerCase().includes(searchLower) ||
      teacher.firstName.toLowerCase().includes(searchLower) ||        // ✅ Recherche par prénom
      teacher.lastName.toLowerCase().includes(searchLower) ||         // ✅ Recherche par nom
      teacher.email.toLowerCase().includes(searchLower) ||            // ✅ Recherche par email
      `${teacher.lastName} ${teacher.firstName}`.toLowerCase().includes(searchLower) // ✅ Nom complet
    );
  }, [teachers, searchTerm]);

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'PR': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'MC': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'MA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'AC': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'AS': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'PTC': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'PES': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'V': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      'VA': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      'EX': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    };
    return colors[grade] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Sélectionner un Enseignant</h3>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, ID ou grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredTeachers.length} enseignant{filteredTeachers.length > 1 ? 's' : ''} trouvé{filteredTeachers.length > 1 ? 's' : ''}
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredTeachers.map(teacher => (
              <button
                key={teacher.id}
                onClick={() => onTeacherSelect(teacher.id)}
                className={`
                  w-full p-3 rounded-lg border-2 transition-all text-left
                  ${selectedTeacherId === teacher.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
                `}
              >
                <div className="space-y-2">
                  {/* En-tête avec avatar et nom */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base truncate">
                          {teacher.lastName} {teacher.firstName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {teacher.id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm flex-shrink-0">
                      <div className="font-semibold text-lg">{teacher.assignmentCount}</div>
                      <div className="text-muted-foreground text-xs">surveillance{teacher.assignmentCount > 1 ? 's' : ''} • {teacher.examCount} examen{teacher.examCount > 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {/* Email */}
                  {teacher.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-[52px]">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="font-mono truncate">{teacher.email}</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex gap-1 pl-[52px] flex-wrap">
                    <Badge className={getGradeColor(teacher.grade)} variant="secondary">
                      {teacher.grade}
                    </Badge>
                    {teacher.isResponsible && (
                      <Badge className="bg-green-600 text-white">Responsable</Badge>
                    )}

                  </div>
                </div>
              </button>
            ))}

            {filteredTeachers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Aucun enseignant trouvé</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}