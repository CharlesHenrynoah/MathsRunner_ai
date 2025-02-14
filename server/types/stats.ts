export interface UserStats {
  user: {
    id: string;
    username: string;
    email: string;
    date: string;
  };
  dataByDate: Array<{
    date: string;
    personalStats: {
      level: number;
      averageScore: number;
      bestScore: number;
      averageResponseTime: number | null;
    };
    statsByType: Array<{
      type: string;
      correct: number;
      total: number;
      accuracy: string;
    }>;
    lastGame: {
      score: number;
      levelReached: number;
      correctQuestions: number;
      incorrectQuestions: number;
      averageResponseTime: number | null;
      bestType: string;
    };
    gameHistory: Array<{
      date: string;
      problemTypes: string[];
      maxLevelReached: number;
      score: number;
    }>;
  }>;
}
