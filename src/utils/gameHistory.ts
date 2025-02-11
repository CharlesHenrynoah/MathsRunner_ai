import { GameStats } from '../types/game';

export interface GameSession {
  timestamp: string;
  level: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  averageResponseTime: number;
  accuracy: number;
  addition: { correct: number; total: number };
  subtraction: { correct: number; total: number };
  multiplication: { correct: number; total: number };
  division: { correct: number; total: number };
  power: { correct: number; total: number };
  algebraic: { correct: number; total: number };
}

export function formatGameStatsToCSV(gameStats: GameStats): GameSession {
  const accuracy = gameStats.totalAttempts > 0 
    ? (gameStats.correctAnswers / gameStats.totalAttempts) * 100 
    : 0;

  return {
    timestamp: new Date().toISOString(),
    level: gameStats.level,
    score: gameStats.score,
    correctAnswers: gameStats.correctAnswers,
    totalAttempts: gameStats.totalAttempts,
    averageResponseTime: gameStats.averageResponseTime,
    accuracy,
    addition: gameStats.problemTypes.addition,
    subtraction: gameStats.problemTypes.subtraction,
    multiplication: gameStats.problemTypes.multiplication,
    division: gameStats.problemTypes.division,
    power: gameStats.problemTypes.power,
    algebraic: gameStats.problemTypes.algebraic,
  };
}

export function convertToCSV(session: GameSession): string {
  const headers = Object.keys(session).join(',');
  const values = Object.values(session).map(value => {
    if (typeof value === 'object') {
      return `"${JSON.stringify(value)}"`;
    }
    return value;
  }).join(',');
  
  return `${headers}\n${values}`;
}

export function appendToCSV(existingContent: string, session: GameSession): string {
  const values = Object.values(session).map(value => {
    if (typeof value === 'object') {
      return `"${JSON.stringify(value)}"`;
    }
    return value;
  }).join(',');
  
  return `${existingContent}\n${values}`;
}

export async function saveGameSession(gameStats: GameStats) {
  const session = formatGameStatsToCSV(gameStats);
  const csvData = convertToCSV(session);
  
  try {
    // Utiliser l'API File System Access pour sauvegarder le fichier
    const handle = await window.showSaveFilePicker({
      suggestedName: 'mathrunner_history.csv',
      types: [{
        description: 'CSV File',
        accept: { 'text/csv': ['.csv'] },
      }],
    });
    
    const writable = await handle.createWritable();
    await writable.write(csvData);
    await writable.close();
    
    return true;
  } catch (error) {
    console.error('Error saving game session:', error);
    return false;
  }
}
