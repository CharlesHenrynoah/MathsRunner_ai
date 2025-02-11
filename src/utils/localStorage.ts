import { GameSession, formatGameStatsToCSV } from './gameHistory';
import { GameStats } from '../types/game';

const STORAGE_KEY = 'mathrunner_history';

export function saveGameHistoryToLocalStorage(gameStats: GameStats) {
  try {
    const session = formatGameStatsToCSV(gameStats);
    const existingHistory = getGameHistory();
    existingHistory.push(session);
    
    // Garder seulement les 100 dernières sessions pour éviter de surcharger le stockage
    if (existingHistory.length > 100) {
      existingHistory.shift();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingHistory));
    return true;
  } catch (error) {
    console.error('Error saving game history to localStorage:', error);
    return false;
  }
}

export function getGameHistory(): GameSession[] {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading game history from localStorage:', error);
    return [];
  }
}

export function clearGameHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing game history:', error);
    return false;
  }
}
