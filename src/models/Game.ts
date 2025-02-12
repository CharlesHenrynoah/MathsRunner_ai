import { GameStats, ProblemType, ProblemTypeStats, Operation } from '../types/game';
import { userStatsService } from '../services/userStatsService';

export class GameSession {
    private score: number = 0;
    private level: number = 1;
    private startTime: Date;
    private problemTypes: Record<ProblemType, ProblemTypeStats> = {
        addition: this.initProblemTypeStats(),
        subtraction: this.initProblemTypeStats(),
        multiplication: this.initProblemTypeStats(),
        division: this.initProblemTypeStats(),
        puissance: this.initProblemTypeStats(),
        algebre: this.initProblemTypeStats()
    };

    constructor() {
        this.startTime = new Date();
    }

    private initProblemTypeStats(): ProblemTypeStats {
        return {
            operations: [],
            correct: 0,
            total: 0,
            totalTime: 0,
            averageTime: 0
        };
    }

    public updateScore(points: number) {
        this.score += points;
    }

    public updateLevel(level: number) {
        this.level = level;
    }

    public recordProblemAttempt(
        type: ProblemType,
        expression: string,
        answer: number,
        userAnswer: number,
        timeSpent: number,
        correct: boolean
    ) {
        const stats = this.problemTypes[type];
        const operation: Operation = {
            id: `${type}_${Date.now()}`,
            type,
            expression,
            answer,
            userAnswer,
            timeSpent,
            correct,
            timestamp: new Date().toISOString()
        };
        
        stats.operations.push(operation);
        stats.total += 1;
        stats.totalTime += timeSpent;
        stats.averageTime = stats.totalTime / stats.total;
        if (correct) {
            stats.correct += 1;
        }
    }

    public async endGame(forced: boolean = false) {
        const endTime = new Date();

        let totalAttempts = 0;
        let totalCorrect = 0;
        let totalResponseTime = 0;

        Object.values(this.problemTypes).forEach(stats => {
            totalAttempts += stats.total;
            totalCorrect += stats.correct;
            totalResponseTime += stats.totalTime;
        });

        const gameStats: GameStats = {
            score: this.score,
            level: this.level,
            totalAttempts,
            correctAnswers: totalCorrect,
            totalResponseTime,
            averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
            problemTypes: this.problemTypes,
            timestamp: new Date().toISOString(),
            forcedEnd: forced
        };

        try {
            await userStatsService.saveUserStats(gameStats);
            return gameStats;
        } catch (error) {
            console.error('Error saving game stats:', error);
            throw error;
        }
    }

    public getCurrentStats(): GameStats {
        let totalAttempts = 0;
        let totalCorrect = 0;
        let totalResponseTime = 0;

        Object.values(this.problemTypes).forEach(stats => {
            totalAttempts += stats.total;
            totalCorrect += stats.correct;
            totalResponseTime += stats.totalTime;
        });

        return {
            score: this.score,
            level: this.level,
            totalAttempts,
            correctAnswers: totalCorrect,
            totalResponseTime,
            averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
            problemTypes: this.problemTypes,
            timestamp: new Date().toISOString()
        };
    }
}
