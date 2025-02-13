const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
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

// Routes des statistiques
app.post('/api/stats', async (req, res) => {
  try {
    const stats = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const statLine = `${id},${stats.userId},${stats.pseudo},${timestamp},${stats.level},${stats.score},${stats.accuracy},${stats.avgResponseTime}\n`;
    await fs.appendFile(STATS_FILE, statLine);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des stats:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des stats' });
  }
});

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
    const statsData = await fs.readFile(STATS_FILE, 'utf-8');
    const userStats = statsData.split('\n').slice(1)
      .filter(line => line && line.split(',')[1] === userId)
      .map(line => {
        const [_, __, ___, ____, level, score, accuracy, avgResponseTime] = line.split(',');
        return {
          level: parseInt(level),
          score: parseInt(score),
          accuracy: parseFloat(accuracy),
          avgResponseTime: parseFloat(avgResponseTime)
        };
      });

    if (userStats.length === 0) {
      return res.json({
        bestScore: 0,
        averageScore: 0,
        totalGames: 0,
        bestLevel: 0,
        bestAccuracy: 0,
        bestResponseTime: 0
      });
    }

    const summary = {
      bestScore: Math.max(...userStats.map(s => s.score)),
      averageScore: userStats.reduce((acc, s) => acc + s.score, 0) / userStats.length,
      totalGames: userStats.length,
      bestLevel: Math.max(...userStats.map(s => s.level)),
      bestAccuracy: Math.max(...userStats.map(s => s.accuracy)),
      bestResponseTime: Math.min(...userStats.map(s => s.avgResponseTime))
    };

    res.json(summary);
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du résumé' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
