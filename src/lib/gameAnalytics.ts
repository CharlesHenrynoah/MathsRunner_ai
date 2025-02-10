import { GameStats } from '../types/game';

export function generateCSVData(gameStats: GameStats): string {
  const headers = [
    'Date',
    'Level',
    'Score',
    'Accuracy (%)',
    'Avg Response Time (s)',
    'Addition Accuracy (%)',
    'Subtraction Accuracy (%)',
    'Multiplication Accuracy (%)',
    'Division Accuracy (%)',
    'Power Accuracy (%)',
    'Algebraic Accuracy (%)'
  ].join(',');

  const getAccuracy = (correct: number, total: number) => 
    total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';

  const row = [
    new Date().toISOString(),
    gameStats.level,
    gameStats.score,
    getAccuracy(gameStats.correctAnswers, gameStats.totalAttempts),
    (gameStats.averageResponseTime / 1000).toFixed(1),
    getAccuracy(gameStats.problemTypes.addition.correct, gameStats.problemTypes.addition.total),
    getAccuracy(gameStats.problemTypes.subtraction.correct, gameStats.problemTypes.subtraction.total),
    getAccuracy(gameStats.problemTypes.multiplication.correct, gameStats.problemTypes.multiplication.total),
    getAccuracy(gameStats.problemTypes.division.correct, gameStats.problemTypes.division.total),
    getAccuracy(gameStats.problemTypes.power.correct, gameStats.problemTypes.power.total),
    getAccuracy(gameStats.problemTypes.algebraic.correct, gameStats.problemTypes.algebraic.total)
  ].join(',');

  return `${headers}\n${row}`;
}