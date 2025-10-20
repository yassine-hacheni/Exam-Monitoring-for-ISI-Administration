import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Mail,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PlanningRow {
  Date: string;
  Jour: number;
  Séance: string;
  Heure_Début: string;
  Heure_Fin: string;
  Nombre_Examens: number;
  Enseignant_ID: string;
  Nom: string;
  Prénom: string;
  Email: string;
  Grade: string;
  Responsable: string;
}

interface ResultsTableProps {
  data: PlanningRow[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // 🔹 Gestionnaires d'événements mémoïsés
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDayChange = useCallback((value: string) => {
    setSelectedDay(value);
  }, []);

  const handleSessionChange = useCallback((value: string) => {
    setSelectedSession(value);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
  }, []);

  // 🔹 Formateur de date sécurisé
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Gestion des formats DD/MM/YYYY et YYYY-MM-DD
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('fr-FR');
      } else {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
      }
    } catch {
      return dateString;
    }
  }, []);

  // 🔹 Extraire les jours et séances uniques
  const uniqueDays = useMemo(() => {
    return Array.from(new Set(data.map((row) => row.Jour))).sort((a, b) => a - b);
  }, [data]);

  const uniqueSessions = useMemo(() => {
    return Array.from(new Set(data.map((row) => row.Séance))).sort();
  }, [data]);

  // 🔹 Filtrer les données (recherche enrichie avec gestion des valeurs nulles)
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (row.Enseignant_ID?.toLowerCase() || '').includes(searchLower) ||
        (row.Nombre_Examens?.toString() || '').includes(searchLower) ||
        (row.Grade?.toLowerCase() || '').includes(searchLower) ||
        (row.Nom?.toLowerCase() || '').includes(searchLower) ||
        (row.Prénom?.toLowerCase() || '').includes(searchLower) ||
        (row.Email?.toLowerCase() || '').includes(searchLower) ||
        `${row.Nom || ''} ${row.Prénom || ''}`.toLowerCase().includes(searchLower);

      const matchesDay = selectedDay === 'all' || row.Jour.toString() === selectedDay;
      const matchesSession = selectedSession === 'all' || row.Séance === selectedSession;

      return matchesSearch && matchesDay && matchesSession;
    });
  }, [data, searchTerm, selectedDay, selectedSession]);

  // 🔹 Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // 🔹 Réinitialiser la page lors du changement de filtres
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDay, selectedSession, pageSize]);

  // 🔹 Statistiques globales
  const stats = useMemo(() => {
    return {
      totalAssignments: data.length,
      uniqueTeachers: new Set(data.map((r) => r.Enseignant_ID)).size,
      totalExams: data.reduce((sum, r) => sum + (r.Nombre_Examens || 0), 0),
      responsibleCount: data.filter((r) => r.Responsable === 'OUI').length,
    };
  }, [data]);

  // 🔹 Couleurs des grades
  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      PR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      MC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      MA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      AC: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      AS: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      PTC: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      PES: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      V: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      VA: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      EX: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    };
    return colors[grade] || 'bg-gray-100 text-gray-800';
  };

  // 🔹 Handlers de pagination
  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);
  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  return (
    <div className="space-y-4">
      {/* 🔹 Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          <div className="text-sm text-muted-foreground">Affectations totales</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.uniqueTeachers}</div>
          <div className="text-sm text-muted-foreground">Enseignants mobilisés</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalExams}</div>
          <div className="text-sm text-muted-foreground">Examens couverts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.responsibleCount}</div>
          <div className="text-sm text-muted-foreground">Responsables assignés</div>
        </Card>
      </div>

      {/* 🔹 Filtres */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, prénom, email, ID, salle ou grade..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
          <Select value={selectedDay} onValueChange={handleDayChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Jour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les jours</SelectItem>
              {uniqueDays.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Jour {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSession} onValueChange={handleSessionChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Séance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les séances</SelectItem>
              {uniqueSessions.map((session) => (
                <SelectItem key={session} value={session}>
                  {session}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 🔹 Résultats */}
      <Card className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Planning de Surveillance</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredData.length} résultat{filteredData.length > 1 ? 's' : ''}
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Jour</TableHead>
                <TableHead>Séance</TableHead>
                <TableHead>Horaire</TableHead>
                <TableHead>Enseignant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Aucun résultat trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {formatDate(row.Date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">J{row.Jour}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{row.Séance}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {row.Heure_Début} - {row.Heure_Fin}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {row.Nom} {row.Prénom}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {row.Enseignant_ID}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.Email ? (
                        <a
                          href={`mailto:${row.Email}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="font-mono text-xs">{row.Email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getGradeColor(row.Grade)}>
                        {row.Grade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.Responsable === 'OUI' ? (
                        <Badge variant="default" className="bg-green-600">
                          OUI
                        </Badge>
                      ) : (
                        <Badge variant="secondary">NON</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 🔹 Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages} ({filteredData.length} résultats)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                aria-label="Première page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium px-2">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                aria-label="Dernière page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}