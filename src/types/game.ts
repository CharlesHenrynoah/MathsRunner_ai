export type ProblemType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'puissance' | 'algebre';

export interface ProblemTypeStats {
  correct: number;
  total: number;
}

export interface GameStats {
  score: number;
  level: number;
  correctAnswers: number;
  totalAttempts: number;
  averageResponseTime: number;
  problemTypes: {
    [key in ProblemType]?: {
      correct: number;
      total: number;
    };
  };
  timestamp?: string;
}

export interface PeriodStats {
  maxLevel: number;
  accuracy: number;
  avgResponseTime: number;
  totalScore: number; 
  maxTotalScore: number; 
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