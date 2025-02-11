export interface ProblemTypeStats {
  correct: number;
  total: number;
}

export interface GameStats {
  level: number;
  score: number; // Score de la partie en cours
  totalAttempts: number;
  correctAnswers: number;
  averageResponseTime: number;
  problemTypes: Record<string, ProblemTypeStats>;
  progression?: {
    level: number;
    accuracy: number;
    responseTime: number;
    score: number;
  };
}

export interface PeriodStats {
  maxLevel: number;
  accuracy: number;
  avgResponseTime: number;
  totalScore: number; // Somme des scores de toutes les parties
  maxTotalScore: number; // Score maximum atteint dans une seule partie
  problemTypes: Record<string, ProblemTypeStats>;
  progression: {
    maxLevel: number;
    accuracy: number;
    avgResponseTime: number;
    totalScore: number;
    maxTotalScore: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  maxLevel: number;
  totalScore: number;
  accuracy: number;
  avgResponseTime: number;
  gamesPlayed: number;
  rank: number;
}

export type TimeFrame = 'day' | 'all';