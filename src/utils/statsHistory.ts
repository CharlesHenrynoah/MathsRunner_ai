import { GameStats, PeriodStats, TimeFrame } from '../types/game';
import { saveStatsToCSV, getStatsFromCSV } from './csvExport';

const DEFAULT_STATS: PeriodStats = {
  maxLevel: 0,
  accuracy: 0,
  avgResponseTime: 0,
  totalScore: 0,
  maxTotalScore: 0,
  problemTypes: {
    addition: { correct: 0, total: 0 },
    subtraction: { correct: 0, total: 0 },
    multiplication: { correct: 0, total: 0 },
    division: { correct: 0, total: 0 },
    power: { correct: 0, total: 0 },
    algebraic: { correct: 0, total: 0 }
  },
  progression: {
    maxLevel: 0,
    accuracy: 0,
    avgResponseTime: 0,
    totalScore: 0,
    maxTotalScore: 0
  }
};

export function getStatsForPeriod(timeframe: TimeFrame): PeriodStats {
  try {
    const csvData = getStatsFromCSV();
    if (csvData.length === 0) {
      return { ...DEFAULT_STATS };
    }

    const now = new Date();
    const today = new Date(now).setHours(0, 0, 0, 0);
    
    // Filtrer les statistiques en fonction de la période
    let filteredStats = timeframe === 'day'
      ? csvData.filter(entry => new Date(entry.timestamp).getTime() >= today)
      : csvData;

    if (filteredStats.length === 0) {
      return { ...DEFAULT_STATS };
    }

    // Calculer les statistiques de la période
    const stats = filteredStats.reduce((acc, entry) => {
      acc.maxLevel = Math.max(acc.maxLevel, entry.level);
      acc.maxTotalScore = Math.max(acc.maxTotalScore, entry.score);
      acc.totalScore += entry.score;
      acc.totalAttempts += entry.totalAttempts;
      acc.correctAnswers += entry.correctAnswers;
      acc.totalResponseTime += entry.averageResponseTime * entry.totalAttempts;

      // Accumuler les statistiques par type
      ['addition', 'subtraction', 'multiplication', 'division', 'power', 'algebraic'].forEach(type => {
        acc.problemTypes[type].correct += entry[`${type}Correct`];
        acc.problemTypes[type].total += entry[`${type}Total`];
      });

      return acc;
    }, {
      maxLevel: 0,
      maxTotalScore: 0,
      totalScore: 0,
      totalAttempts: 0,
      correctAnswers: 0,
      totalResponseTime: 0,
      problemTypes: {
        addition: { correct: 0, total: 0 },
        subtraction: { correct: 0, total: 0 },
        multiplication: { correct: 0, total: 0 },
        division: { correct: 0, total: 0 },
        power: { correct: 0, total: 0 },
        algebraic: { correct: 0, total: 0 }
      }
    });

    // Calculer les moyennes
    const accuracy = stats.totalAttempts > 0 
      ? (stats.correctAnswers / stats.totalAttempts) * 100 
      : 0;
    const avgResponseTime = stats.totalAttempts > 0 
      ? stats.totalResponseTime / stats.totalAttempts 
      : 0;

    // Calculer la progression si on est en mode 'day'
    let progression = {
      maxLevel: 0,
      accuracy: 0,
      avgResponseTime: 0,
      totalScore: 0,
      maxTotalScore: 0
    };

    if (timeframe === 'day') {
      const yesterdayStart = today - 24 * 60 * 60 * 1000;
      const yesterdayStats = csvData.filter(entry => {
        const timestamp = new Date(entry.timestamp).getTime();
        return timestamp >= yesterdayStart && timestamp < today;
      });

      if (yesterdayStats.length > 0) {
        const yesterdayTotals = yesterdayStats.reduce((acc, entry) => ({
          maxLevel: Math.max(acc.maxLevel, entry.level),
          totalAttempts: acc.totalAttempts + entry.totalAttempts,
          correctAnswers: acc.correctAnswers + entry.correctAnswers,
          totalResponseTime: acc.totalResponseTime + (entry.averageResponseTime * entry.totalAttempts),
          totalScore: acc.totalScore + entry.score,
          maxScore: Math.max(acc.maxScore, entry.score)
        }), {
          maxLevel: 0,
          totalAttempts: 0,
          correctAnswers: 0,
          totalResponseTime: 0,
          totalScore: 0,
          maxScore: 0
        });

        const yesterdayAccuracy = yesterdayTotals.totalAttempts > 0 
          ? (yesterdayTotals.correctAnswers / yesterdayTotals.totalAttempts) * 100 
          : 0;
        const yesterdayAvgResponseTime = yesterdayTotals.totalAttempts > 0 
          ? yesterdayTotals.totalResponseTime / yesterdayTotals.totalAttempts 
          : 0;

        const calculateProgress = (current: number, previous: number) => {
          if (previous === 0) return 0;
          return ((current - previous) / previous) * 100;
        };

        progression = {
          maxLevel: calculateProgress(stats.maxLevel, yesterdayTotals.maxLevel),
          accuracy: calculateProgress(accuracy, yesterdayAccuracy),
          avgResponseTime: calculateProgress(-avgResponseTime, -yesterdayAvgResponseTime),
          totalScore: calculateProgress(stats.totalScore, yesterdayTotals.totalScore),
          maxTotalScore: calculateProgress(stats.maxTotalScore, yesterdayTotals.maxScore)
        };
      }
    }

    return {
      maxLevel: stats.maxLevel,
      accuracy,
      avgResponseTime,
      totalScore: stats.totalScore,
      maxTotalScore: stats.maxTotalScore,
      problemTypes: stats.problemTypes,
      progression
    };
  } catch (error) {
    console.error('Error calculating period stats:', error);
    return { ...DEFAULT_STATS };
  }
}

export function saveGameStats(stats: GameStats): boolean {
  try {
    saveStatsToCSV(stats);
    return true;
  } catch (error) {
    console.error('Error saving game stats:', error);
    return false;
  }
}

export function updateMaxLevels(level: number): void {
  const currentStats = getStatsForPeriod('all');
  if (level > currentStats.maxLevel) {
    const stats: GameStats = {
      level,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      averageResponseTime: 0,
      problemTypes: {
        addition: { correct: 0, total: 0 },
        subtraction: { correct: 0, total: 0 },
        multiplication: { correct: 0, total: 0 },
        division: { correct: 0, total: 0 },
        power: { correct: 0, total: 0 },
        algebraic: { correct: 0, total: 0 }
      }
    };
    saveGameStats(stats);
  }
}
