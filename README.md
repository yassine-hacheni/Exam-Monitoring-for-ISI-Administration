# 📚 Documentation Complète - Application de Surveillance des Examens

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du Projet](#architecture-du-projet)
3. [Technologies Utilisées](#technologies-utilisées)
4. [Structure des Dossiers](#structure-des-dossiers)
5. [Fonctionnalités Principales](#fonctionnalités-principales)
6. [Configuration et Installation](#configuration-et-installation)
7. [Système de Planification Python](#système-de-planification-python)
8. [Base de Données](#base-de-données)
9. [Scripts et Commandes](#scripts-et-commandes)
10. [Build et Déploiement](#build-et-déploiement)

---

## 🎯 Vue d'ensemble

### Description
**Surveillance Examens** est une application desktop Electron pour automatiser l'affectation des enseignants aux sessions de surveillance d'examens. Utilise un algorithme d'optimisation avancé (OR-Tools CP-SAT).

### Auteur
**Mohamed Dhia SELMI**

### Version
**1.0.0**

### Objectifs
- ✅ Automatiser l'affectation des enseignants
- ✅ Respecter les contraintes de disponibilité
- ✅ Équilibrer la charge selon les grades
- ✅ Générer des plannings exportables (Excel, PDF, ICS)
- ✅ Historiser les sessions
- ✅ Permettre l'affectation manuelle

---

## 🏗️ Architecture du Projet

### Type d'Application
**Application Desktop Hybride (Electron + React + Python)**

```
┌─────────────────────────────────────────┐
│      Application Electron               │
│  ┌───────────────────────────────────┐  │
│  │   Frontend (React + Vite)         │  │
│  │   - Interface moderne             │  │
│  │   - TanStack Router               │  │
│  │   - Shadcn/ui + TailwindCSS       │  │
│  └───────────────────────────────────┘  │
│              ↕                          │
│  ┌───────────────────────────────────┐  │
│  │   Main Process (Node.js)          │  │
│  │   - Gestion fenêtres              │  │
│  │   - IPC Communication             │  │
│  │   - SQLite Database               │  │
│  └───────────────────────────────────┘  │
│              ↕                          │
│  ┌───────────────────────────────────┐  │
│  │   Backend Python (OR-Tools)       │  │
│  │   - Algorithme CP-SAT             │  │
│  │   - Import/Export Excel           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 💻 Technologies Utilisées

### Frontend
- **React** 18.3.1 - Framework UI
- **TypeScript** 5.6.2 - Typage statique
- **Vite** 7.1.10 - Build tool
- **TanStack Router** 1.98.5 - Routage
- **TanStack Query** 5.90.2 - État et cache
- **TailwindCSS** 4.0.0 - Styling
- **Shadcn/ui** - Composants UI
- **Lucide React** 0.468.0 - Icônes
- **React Hook Form** 7.65.0 - Formulaires
- **Zod** 3.25.76 - Validation
- **Recharts** 3.3.0 - Graphiques
- **XLSX** 0.18.5 - Excel
- **Sonner** 2.0.7 - Notifications

### Backend
- **Electron** 38.2.2 - Framework desktop
- **Better-SQLite3** 12.4.1 - Base de données
- **Python** 3.x - Langage backend
- **OR-Tools** 9.14.6206 - Optimisation
- **Pandas** 2.3.1 - Manipulation données

### Build Tools
- **Electron Builder** 26.0.12 - Packaging
- **ESLint** 9.17.0 - Linting
- **Prettier** 3.4.2 - Formatage

---

## 📁 Structure des Dossiers

```
surveillance-examens/
├── electron/                    # Code Electron
│   ├── main.cjs                # Point d'entrée
│   ├── preload.cjs             # Préchargement
│   ├── database.cjs            # SQLite
│   └── python/                 # Scripts Python
│       ├── main.py             # Algorithme
│       └── venv/               # Env virtuel
│
├── src/                        # Code React
│   ├── main.tsx                # Point d'entrée
│   ├── components/             # Composants réutilisables
│   ├── features/               # Fonctionnalités
│   │   ├── planning/           # Génération planning
│   │   ├── history/            # Historique
│   │   ├── AffectationManuelle/# Affectation manuelle
│   │   ├── dashboard/          # Tableau de bord
│   │   └── settings/           # Paramètres
│   ├── context/                # Contextes React
│   ├── hooks/                  # Hooks custom
│   ├── routes/                 # Routes
│   └── styles/                 # Styles
│
├── build/                      # Ressources build
├── dist/                       # Build production
├── release/                    # Installateurs
├── package.json                # Dépendances Node
├── requirements.txt            # Dépendances Python
└── vite.config.ts              # Config Vite
```

---

## ⚙️ Fonctionnalités Principales

### 1. 📊 Génération Automatique de Planning

**Processus**:
1. Upload de 3 fichiers Excel:
    - Enseignants participants
    - Souhaits/Indisponibilités
    - Répartition examens

2. Configuration heures par grade:
    - PR: 6.0h, MA: 10.5h, MC: 6.0h
    - AC: 13.5h, AS: 12.0h
    - PTC/PES: 13.5h, VA/V: 6.0h, EX: 4.5h

3. Exécution algorithme Python (CP-SAT)

4. Génération résultat avec visualisations

**Contraintes**:
- HARD: Heures exactes, minimum 2 par examen, indisponibilités
- SOFT: Enseignants responsables (200), buffer (150), clustering temps (100), jours (50)

### 2. 📅 Visualisation du Planning

**3 modes de vue**:
- **Calendrier**: Par jour et séance (S1-S4)
- **Tableau**: Liste complète avec filtres
- **Enseignant**: Planning individuel

**Séances fixes**:
- S1: 08:30-10:00 (1.5h)
- S2: 10:30-12:00 (1.5h)
- S3: 12:30-14:00 (1.5h)
- S4: 14:30-16:00 (1.5h)

### 3. 💾 Historique des Sessions

- Sauvegarde automatique SQLite
- Métadonnées complètes
- Consultation sessions passées
- Réouverture et export

### 4. ✏️ Affectation Manuelle

- Modification des affectations
- Ajout/Retrait enseignants
- Validation contraintes temps réel

### 5. 📤 Export Multi-formats

- **Excel**: Tableaux formatés
- **PDF**: Planning imprimable
- **ICS**: Calendrier importable

### 6. 🔐 Sécurité

- PIN Lock au démarrage (1234)
- Session persistante
- Données locales sécurisées

### 7. 🎨 Interface Moderne

- Design Shadcn/ui
- Mode sombre/clair
- Responsive
- Animations fluides
- Support RTL

---

## 🚀 Configuration et Installation

### Prérequis
- Node.js 18+
- Python 3.8+
- Windows 10/11 (64-bit)

### Installation

```bash
# 1. Cloner le projet
git clone <repository-url>
cd surveillance-examens/shadcn-admin

# 2. Installer dépendances Node
npm install

# 3. Configurer Python
cd electron/python
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 4. Reconstruire SQLite
npm run rebuild
```

### Lancement

```bash
# Développement web
npm run dev

# Développement Electron
npm run electron:dev

# Build production
npm run electron:build
```

---

## 🐍 Système de Planification Python

### Fichier Principal
`electron/python/main.py` (970 lignes)

### Structures de Données

```python
@dataclass
class Teacher:
    id: str
    grade: str
    required_hours: float
    first_name: str
    last_name: str
    email: str
    unavailable_days: Set[int]
    unavailable_slots: Set[Tuple[int, int]]

@dataclass
class TimeSlotInfo:
    day: int
    slot: int  # 1-4
    date: str
    num_exams: int
    exam_ids: List[str]
    responsible_teachers: Set[str]
```

### Algorithme CP-SAT

**Variables**: `assignments[(teacher_id, (day, slot))] = BoolVar`

**Contraintes HARD**:
1. Heures exactes par enseignant
2. Minimum 2 enseignants par examen
3. Respect indisponibilités

**Contraintes SOFT**:
1. Priorité 0 (200): Responsables sur leurs examens
2. Priorité 1 (150): Atteindre buffer
3. Priorité 2 (100): Clustering temporel
4. Priorité 3 (50): Clustering jours

**Solveur**: Google OR-Tools CP-SAT (30s timeout)

### Import Données

**3 fichiers Excel requis**:

1. **Enseignants_participants.xlsx**:
    - code_smartex_ens, nom_ens, prenom_ens
    - email_ens, grade_code_ens
    - participe_surveillance (TRUE/FALSE)

2. **Souhaits_avec_ids.xlsx**:
    - Enseignant (nom)
    - Jour (Lundi, Mardi, etc.)
    - Séances (S1,S2,S3,S4)

3. **Répartition_SE_dedup.xlsx**:
    - dateExam (DD/MM/YYYY)
    - h_debut (heure)
    - enseignant (ID responsable)

### Export Résultat

**schedule_solution.xlsx**:
- Date, Jour, Séance
- Heure_Début, Heure_Fin
- Nombre_Examens
- Enseignant_ID, Nom, Prénom, Email
- Grade, Responsable (OUI/NON)

---

## 💾 Base de Données

### Technologie
**Better-SQLite3** - SQLite synchrone

### Localisation
```
Windows: %APPDATA%\surveillance-examens\surveillance_history.db
macOS: ~/Library/Application Support/surveillance-examens/
Linux: ~/.config/surveillance-examens/
```

### Schéma

```sql
-- Sessions de planification
CREATE TABLE planning_sessions (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    session_type TEXT NOT NULL,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT,
    stats_total_assignments INTEGER,
    stats_teachers_count INTEGER,
    stats_exams_count INTEGER
);

-- Affectations
CREATE TABLE planning_assignments (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    session TEXT NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    exam_count INTEGER NOT NULL,
    teacher_id TEXT NOT NULL,
    grade TEXT NOT NULL,
    is_responsible TEXT NOT NULL,
    teacher_first_name TEXT,
    teacher_last_name TEXT,
    teacher_email TEXT,
    FOREIGN KEY (session_id) 
        REFERENCES planning_sessions(id) 
        ON DELETE CASCADE
);

-- Index
CREATE INDEX idx_session_id ON planning_assignments(session_id);
CREATE INDEX idx_teacher ON planning_assignments(teacher_id);
CREATE INDEX idx_date ON planning_assignments(date);
```

### API IPC

```javascript
// Sauvegarder session
ipcMain.handle('save-planning-session', async (event, data) => {...});

// Récupérer sessions
ipcMain.handle('get-all-sessions', async () => {...});

// Détails session
ipcMain.handle('get-session-details', async (event, id) => {...});

// Supprimer session
ipcMain.handle('delete-session', async (event, id) => {...});
```

---

## 📜 Scripts et Commandes

### Développement

```bash
# Serveur dev Vite
npm run dev

# Electron dev (Vite + Electron)
npm run electron:dev

# Electron seul
npm run electron

# Linting
npm run lint

# Formatage
npm run format

# Type checking
npm run type-check
```

### Build

```bash
# Build web
npm run build

# Preview build
npm run preview

# Build Electron Windows
npm run electron:build

# Build sans empaquetage
npm run electron:build:dir
```

### Maintenance

```bash
# Reconstruire SQLite
npm run rebuild

# Post-install
npm run postinstall
```

---

## 📦 Build et Déploiement

### Configuration Electron Builder

```json
{
  "appId": "com.surveillance.examens",
  "productName": "Surveillance Examens",
  "directories": {
    "output": "release",
    "buildResources": "build"
  },
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true
  }
}
```

### Processus de Build

1. **Build frontend**: `npm run build` → `dist/`
2. **Copie ressources**: Python, icônes
3. **Empaquetage**: Electron Builder
4. **Génération installateur**: `release/`

### Fichiers Générés

```
release/
├── Surveillance Examens-Setup-1.0.0.exe  # Installateur Windows
├── win-unpacked/                         # Version non empaquetée
└── builder-debug.yml                     # Debug info
```

### Distribution

**Windows**:
- Installateur NSIS
- Taille: ~200-300 MB
- Inclut: Node.js, Chromium, Python, dépendances

---

## 🔧 Guide de Développement

### Structure du Code

**Frontend (React)**:
- Composants fonctionnels + Hooks
- TypeScript strict
- TanStack Router pour routage
- TanStack Query pour état serveur
- Zustand pour état global

**Backend (Electron)**:
- CommonJS (`.cjs`)
- IPC handlers pour communication
- Spawn Python processes
- SQLite synchrone

**Python**:
- Dataclasses pour structures
- OR-Tools pour optimisation
- Pandas pour Excel
- Type hints

### Conventions

**Nommage**:
- Composants: PascalCase
- Fichiers: kebab-case
- Variables: camelCase
- Constantes: UPPER_SNAKE_CASE

**Organisation**:
- Feature-based structure
- Co-location des fichiers liés
- Index files pour exports

### Debugging

**Frontend**:
```javascript
// DevTools ouvert en dev
mainWindow.webContents.openDevTools();
```

**Electron Main**:
```javascript
console.log('Debug:', data);
```

**Python**:
```python
print(f"Debug: {variable}")
```

### Tests

**Recommandations**:
- Unit tests: Vitest
- E2E tests: Playwright
- Python tests: pytest

---

## 📝 Notes Importantes

### Sécurité
- Données stockées localement
- Pas de connexion réseau requise
- PIN Lock pour protection

### Performance
- SQLite pour rapidité
- Optimisation CP-SAT (30s max)
- Lazy loading des routes

### Limitations
- Windows principalement (macOS/Linux possibles)
- Fichiers Excel format spécifique
- Python 3.8+ requis

### Support
- Issues GitHub
- Documentation inline
- Logs détaillés

---

## 🎓 Ressources

### Documentation Externe
- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [TanStack Router](https://tanstack.com/router)
- [OR-Tools](https://developers.google.com/optimization)
- [Shadcn/ui](https://ui.shadcn.com)

### Dépendances Clés
- electron: ^38.2.2
- react: ^18.3.1
- ortools: 9.14.6206
- better-sqlite3: ^12.4.1

---

**Dernière mise à jour**: 2025-01-20
**Version**: 1.0.0
**Auteur**: Mohamed Dhia SELMI
