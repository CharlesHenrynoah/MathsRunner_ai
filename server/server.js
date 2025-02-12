const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const { saveGameStats, getAllStats, getUserStats } = require('./statsStorage');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration CORS détaillée
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add Content Security Policy headers for development
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' http://localhost:* data:; font-src * data: 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data: 'unsafe-inline'"
  );
  next();
});

app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.csv');
const STATS_FILE = path.join(DATA_DIR, 'stats.csv');

// Créer le dossier data s'il n'existe pas
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Créer les fichiers CSV s'ils n'existent pas
async function ensureFiles() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, 'id,pseudo,email,password,createdAt,lastLogin\n');
  }
  try {
    await fs.access(STATS_FILE);
  } catch {
    await fs.writeFile(STATS_FILE, 'id,userId,pseudo,timestamp,level,score,accuracy,avgResponseTime\n');
  }
}

// Initialisation
(async () => {
  await ensureDataDir();
  await ensureFiles();
})();

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast function
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { pseudo, email, password } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const usersData = await fs.readFile(USERS_FILE, 'utf-8');
    const users = usersData.split('\n').slice(1);
    if (users.some(user => user.split(',')[2] === email)) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    if (users.some(user => user.split(',')[1] === pseudo)) {
      return res.status(400).json({ error: 'Ce pseudo est déjà utilisé' });
    }

    // Créer le nouvel utilisateur
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const now = new Date().toISOString();
    const newUser = `${id},${pseudo},${email},${hashedPassword},${now},${now}\n`;
    
    await fs.appendFile(USERS_FILE, newUser);
    
    res.json({
      id,
      pseudo,
      email,
      createdAt: now,
      lastLogin: now
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const usersData = await fs.readFile(USERS_FILE, 'utf-8');
    const users = usersData.split('\n').slice(1);
    const user = users.find(u => u.split(',')[2] === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const [id, pseudo, _, hashedPassword, createdAt] = user.split(',');
    const validPassword = await bcrypt.compare(password, hashedPassword);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const now = new Date().toISOString();
    
    res.json({
      id,
      pseudo,
      email,
      createdAt,
      lastLogin: now
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Endpoint pour sauvegarder les stats d'un utilisateur
app.post('/api/stats/:userId', (req, res) => {
    const { userId } = req.params;
    const stats = getUserStats(userId);
    res.json(stats);
});

// Endpoint pour récupérer les stats d'un utilisateur spécifique
app.get('/api/stats/:userId', (req, res) => {
    const { userId } = req.params;
    const stats = getUserStats(userId);
    res.json(stats);
});

// Endpoint pour récupérer toutes les stats (admin seulement)
app.get('/api/stats', (req, res) => {
    const stats = getAllStats();
    res.json(stats);
});

// Endpoint pour charger les stats
app.get('/api/stats/load', (req, res) => {
    try {
        const stats = getAllStats();
        res.json(stats || {
            level: 1,
            score: 0,
            totalAttempts: 0,
            correctAnswers: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            problemTypes: {
                addition: { operations: [], correct: 0, total: 0, totalTime: 0, averageTime: 0 },
                subtraction: { operations: [], correct: 0, total: 0, totalTime: 0, averageTime: 0 },
                multiplication: { operations: [], correct: 0, total: 0, totalTime: 0, averageTime: 0 },
                division: { operations: [], correct: 0, total: 0, totalTime: 0, averageTime: 0 },
                puissance: { operations: [], correct: 0, total: 0, totalTime: 0, averageTime: 0 },
                algebre: { operations: [], correct: 0, total: 0, totalTime: 0, averageTime: 0 }
            }
        });
    } catch (error) {
        console.error('Error loading stats:', error);
        res.status(500).json({ error: 'Error loading stats' });
    }
});

// Endpoint pour sauvegarder les stats
app.post('/api/stats/save', (req, res) => {
    try {
        const stats = req.body;
        saveGameStats(stats);
        broadcast(stats);
        res.json({ message: 'Stats saved successfully' });
    } catch (error) {
        console.error('Error saving stats:', error);
        res.status(500).json({ error: 'Error saving stats' });
    }
});

// Routes des statistiques
app.get('/api/stats/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const statsData = await fs.readFile(STATS_FILE, 'utf-8');
    const stats = statsData.split('\n').slice(1)
      .filter(line => line && line.split(',')[1] === userId)
      .map(line => {
        const [id, _, pseudo, timestamp, level, score, accuracy, avgResponseTime] = line.split(',');
        return {
          id,
          pseudo,
          timestamp,
          level: parseInt(level),
          score: parseInt(score),
          accuracy: parseFloat(accuracy),
          avgResponseTime: parseFloat(avgResponseTime)
        };
      });
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats' });
  }
});

app.get('/api/stats/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du résumé' });
  }
});

// Dashboard endpoint
app.get('/dashboard', async (req, res) => {
  try {
    const stats = getAllStats();
    res.json({
      stats,
      message: 'Dashboard data loaded successfully'
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).json({ error: 'Error loading dashboard data' });
  }
});

// Démarrage du serveur
const PORT = 3002;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
