import { GameStats } from '../types/game';

export class UserStatsService {
  private statsPath: string;
  private ws: WebSocket;

  constructor() {
    this.statsPath = 'http://localhost:3002/api/stats';
    this.ws = new WebSocket('ws://localhost:3002');
    this.ws.onmessage = (event) => {
      const updatedStats = JSON.parse(event.data);
      this.updateStats(updatedStats);
    };
  }

  async saveUserStats(stats: GameStats): Promise<void> {
    try {
      const response = await fetch(`${this.statsPath}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...stats,
          timestamp: new Date().toISOString(),
          userId: 'current_user' // À remplacer par l'ID de l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save stats');
      }
    } catch (error) {
      console.error('Error saving stats:', error);
      throw error;
    }
  }

  async getUserStats(): Promise<GameStats> {
    try {
      const response = await fetch(`${this.statsPath}/load?userId=current_user`);
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }
      const data = await response.json();
      return {
        score: data.bestScore || 0,
        level: data.lastGameStats?.level || 1,
        totalAttempts: data.totalResponses || 0,
        correctAnswers: Object.values(data.problemTypes).reduce((acc: number, curr: any) => acc + (curr.correct || 0), 0),
        totalResponseTime: data.averageResponseTime * (data.totalResponses || 1),
        averageResponseTime: data.averageResponseTime || 0,
        problemTypes: data.problemTypes || {},
        timestamp: data.lastGameStats?.timestamp
      };
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  }

  private updateStats(updatedStats: any) {
    // Update the state with real-time statistics from WebSocket
    // This function should be implemented to update the state with the received data
  }
}

export const userStatsService = new UserStatsService();
