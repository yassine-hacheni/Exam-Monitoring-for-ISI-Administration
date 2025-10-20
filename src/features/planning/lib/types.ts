export interface PlanningRow {
  Date: string;
  Jour: number;
  Séance: string;
  Heure_Début: string;
  Heure_Fin: string;
  Salle: string;
  Exam_ID: string;
  Enseignant_ID: string;
  Grade: string;
  Responsable: string;
}

export interface UploadedFile {
  name: string;
  path: string;
  type: 'teachers' | 'wishes' | 'exams';
}

export interface ProcessingResult {
  success: boolean;
  outputFile?: string;
  logs?: string;
  error?: string;
}