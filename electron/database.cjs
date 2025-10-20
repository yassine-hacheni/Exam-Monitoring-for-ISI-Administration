const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'surveillance_history.db');
  console.log('Database path:', dbPath);

  db = new Database(dbPath);

  // ✅ ÉTAPE 1 : Créer les tables de base (si elles n'existent pas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS planning_sessions (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    

    CREATE TABLE IF NOT EXISTS planning_assignments (
                                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                                                      FOREIGN KEY (session_id) REFERENCES planning_sessions(id) ON DELETE CASCADE
      );
  `);

  console.log('✅ Base tables created/verified');

  // ✅ ÉTAPE 2 : Migration - Ajouter les nouvelles colonnes
  migrateDatabase(db);

  // ✅ ÉTAPE 3 : Créer les index
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_session_id ON planning_assignments(session_id);
    CREATE INDEX IF NOT EXISTS idx_teacher ON planning_assignments(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_date ON planning_assignments(date);
    CREATE INDEX IF NOT EXISTS idx_teacher_email ON planning_assignments(teacher_email);
  `);

  console.log('✅ Database initialized successfully');
  return db;
}

function migrateDatabase(database) {
  console.log('🔄 Starting database migration...');

  try {
    // Récupérer les colonnes existantes
    const columns = database.pragma('table_info(planning_assignments)');
    const columnNames = columns.map(col => col.name);

    console.log('📋 Current columns:', columnNames.join(', '));

    // Liste des colonnes à ajouter
    const newColumns = [
      { name: 'teacher_first_name', type: 'TEXT' },
      { name: 'teacher_last_name', type: 'TEXT' },
      { name: 'teacher_email', type: 'TEXT' },
      { name: 'exam_count', type: 'INTEGER' }
    ];

    // Ajouter chaque colonne si elle n'existe pas
    newColumns.forEach(({ name, type }) => {
      if (!columnNames.includes(name)) {
        console.log(`➕ Adding column: ${name}`);
        database.exec(`ALTER TABLE planning_assignments ADD COLUMN ${name} ${type}`);
        console.log(`✅ Column ${name} added successfully`);
      } else {
        console.log(`ℹ️  Column ${name} already exists, skipping`);
      }
    });

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Database closed');
  }
}

module.exports = { initDatabase, getDatabase, closeDatabase };