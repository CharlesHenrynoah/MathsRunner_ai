export type GameStats = {
  level: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  averageResponseTime: number;
  problemTypes: Record<string, { correct: number; total: number }>;
};