// Types pour les réponses de l'API Python

export interface GradeConfig {
  grade: string
  nbr_professeurs: number
  surveillances_par_prof: number
  indisponibilites_autorisees: number
}

export interface Ecarts {
  ecart_1_2: number
  ecart_2_3: number
  ecart_3_4: number
}

export interface GradeHoursData {
  nbr_prof_total: number
  nbr_salle_total: number
  nbr_creneau_total: number
  nb_enseignants_par_salle: number
  grades: GradeConfig[]
  ecarts: Ecarts
}

export interface AnalysisResult {
  success: boolean
  data?: GradeHoursData
  details?: {
    nbr_enseignants_total: number
    nbr_sessions_planning: number
    total_surveillances_necessaires: number
  }
  error?: string
}

// Types pour les requêtes API (optionnel - peut être simplifié)
export interface AlgorithmConfig {
  useFixedGap: boolean
  fixedGap?: number
  baseHours: number
}
