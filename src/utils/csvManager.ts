import { User } from '../types/auth';
import { GameStats } from '../types/game';

const USERS_CSV_KEY = 'users_database';
const GAMES_CSV_KEY = 'games_database';

interface GameRecord {
  gameId: string;
  userId: string;
  username: string;
  timestamp: string;
  level: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  averageResponseTime: number;
  problemTypesStats: string; // JSON string of problem types stats
}

export class CSVManager {
  private static instance: CSVManager;

  private constructor() {
    this.initializeCSVs();
  }

  static getInstance(): CSVManager {
    if (!CSVManager.instance) {
      CSVManager.instance = new CSVManager();
    }
    return CSVManager.instance;
  }

  private initializeCSVs() {
    // Initialiser le CSV des utilisateurs s'il n'existe pas
    if (!localStorage.getItem(USERS_CSV_KEY)) {
      const usersHeader = 'userId,username,email,password,createdAt\n';
      localStorage.setItem(USERS_CSV_KEY, usersHeader);
    }

    // Initialiser le CSV des parties s'il n'existe pas
    if (!localStorage.getItem(GAMES_CSV_KEY)) {
      const gamesHeader = 'gameId,userId,username,timestamp,level,score,correctAnswers,totalAttempts,averageResponseTime,problemTypesStats\n';
      localStorage.setItem(GAMES_CSV_KEY, gamesHeader);
    }
  }

  // Méthodes pour les utilisateurs
  addUser(user: User & { password: string }): void {
    const csv = localStorage.getItem(USERS_CSV_KEY) || '';
    const newRow = `${user.id},${user.username},${user.email},${user.password},${new Date().toISOString()}\n`;
    localStorage.setItem(USERS_CSV_KEY, csv + newRow);
  }

  getUserById(userId: string): User | null {
    const csv = localStorage.getItem(USERS_CSV_KEY) || '';
    const rows = csv.split('\n');
    const userRow = rows.find(row => row.startsWith(userId + ','));
    
    if (!userRow) return null;

    const [id, username, email] = userRow.split(',');
    return { id, username, email, token: '' };
  }

  validateUser(identifier: string, password: string): User | null {
    const csv = localStorage.getItem(USERS_CSV_KEY) || '';
    const rows = csv.split('\n').slice(1); // Ignorer l'en-tête

    const userRow = rows.find(row => {
      const [id, username, email, pwd] = row.split(',');
      return (username === identifier || email === identifier) && pwd === password;
    });

    if (!userRow) return null;

    const [id, username, email] = userRow.split(',');
    return { id, username, email, token: '' };
  }

  // Méthodes pour les parties
  addGameRecord(userId: string, gameStats: GameStats): void {
    const user = this.getUserById(userId);
    if (!user) return;

    const gameRecord: GameRecord = {
      gameId: crypto.randomUUID(),
      userId,
      username: user.username,
      timestamp: new Date().toISOString(),
      level: gameStats.level,
      score: gameStats.score,
      correctAnswers: gameStats.correctAnswers,
      totalAttempts: gameStats.totalAttempts,
      averageResponseTime: gameStats.averageResponseTime,
      problemTypesStats: JSON.stringify(gameStats.problemTypes)
    };

    const csv = localStorage.getItem(GAMES_CSV_KEY) || '';
    const newRow = `${Object.values(gameRecord).join(',')}\n`;
    localStorage.setItem(GAMES_CSV_KEY, csv + newRow);
  }

  getUserGames(userId: string): GameRecord[] {
    const csv = localStorage.getItem(GAMES_CSV_KEY) || '';
    const rows = csv.split('\n').slice(1); // Ignorer l'en-tête
    
    return rows
      .filter(row => row.includes(userId))
      .map(row => {
        const [
          gameId,
          userId,
          username,
          timestamp,
          level,
          score,
          correctAnswers,
          totalAttempts,
          averageResponseTime,
          problemTypesStats
        ] = row.split(',');

        return {
          gameId,
          userId,
          username,
          timestamp,
          level: Number(level),
          score: Number(score),
          correctAnswers: Number(correctAnswers),
          totalAttempts: Number(totalAttempts),
          averageResponseTime: Number(averageResponseTime),
          problemTypesStats
        };
      });
  }

  // Méthode pour exporter les données d'un utilisateur
  exportUserData(userId: string): string {
    const user = this.getUserById(userId);
    if (!user) return '';

    const games = this.getUserGames(userId);
    const userGamesCSV = games.map(game => 
      `${game.gameId},${game.timestamp},${game.level},${game.score},${game.correctAnswers},${game.totalAttempts},${game.averageResponseTime},${game.problemTypesStats}`
    ).join('\n');

    return `User Data for ${user.username}\n\nGame History:\ngameId,timestamp,level,score,correctAnswers,totalAttempts,averageResponseTime,problemTypesStats\n${userGamesCSV}`;
  }
}

export const csvManager = CSVManager.getInstance();
