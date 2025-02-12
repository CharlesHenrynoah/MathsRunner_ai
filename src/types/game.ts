export type ProblemType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'puissance' | 'algebre';

export interface Operation {
  id: string;
  type: ProblemType;
  expression: string;
  answer: number;
  userAnswer?: number;
  timeSpent: number;
  correct: boolean;
  timestamp: string;
}

export interface ProblemTypeStats {
  operations: Operation[];
  correct: number;
  total: number;
  totalTime: number;
  averageTime: number;
}

export interface GameStats {
  score: number;
  level: number;
  totalAttempts: number;
  correctAnswers: number;
  totalResponseTime: number;
  averageResponseTime: number;
  problemTypes: Record<ProblemType, ProblemTypeStats>;
  timestamp?: string;
  forcedEnd?: boolean;
}

export interface Problem {
  type: ProblemType;
  expression: string;
  answer: number;
  id: string;
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