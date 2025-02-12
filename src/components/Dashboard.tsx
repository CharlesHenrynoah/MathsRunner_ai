import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Target, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProblemType } from '../types/game';

const API_BASE_URL = 'http://localhost:3002';

interface GlobalStats {
  bestScore: number;
  averageScore: number;
  totalGames: number;
  averageResponseTime: number;
  totalResponses: number;
  lastGameStats?: {
    score: number;
    level: number;
    correctAnswers: number;
    totalAttempts: number;
    averageResponseTime: number;
    timestamp?: string;
  };
  problemTypes: Record<ProblemType, {
    correct: number;
    total: number;
    averageTime: number;
  }>;
}

const DEFAULT_GLOBAL_STATS: GlobalStats = {
  bestScore: 0,
  averageScore: 0,
  totalGames: 0,
  averageResponseTime: 0,
  totalResponses: 0,
  problemTypes: {
    addition: { correct: 0, total: 0, averageTime: 0 },
    subtraction: { correct: 0, total: 0, averageTime: 0 },
    multiplication: { correct: 0, total: 0, averageTime: 0 },
    division: { correct: 0, total: 0, averageTime: 0 },
    puissance: { correct: 0, total: 0, averageTime: 0 },
    algebre: { correct: 0, total: 0, averageTime: 0 }
  }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GlobalStats>(DEFAULT_GLOBAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats/load?userId=current_user`);
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }
      const data = await response.json();
      const calculatedStats = calculateGlobalStats(data);
      setStats(calculatedStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load statistics');
      setLoading(false);
    }
  };

  const calculateGlobalStats = (gameStats: any | null): GlobalStats => {
    if (!gameStats) {
      return DEFAULT_GLOBAL_STATS;
    }

    const problemTypes = Object.entries(gameStats.problemTypes || {}).reduce((acc, [type, data]) => {
      if (data && typeof data === 'object') {
        const typedData = data as { correct?: number; total?: number; averageTime?: number };
        acc[type as ProblemType] = {
          correct: typedData.correct || 0,
          total: typedData.total || 0,
          averageTime: typedData.averageTime || 0
        };
      } else {
        acc[type as ProblemType] = { correct: 0, total: 0, averageTime: 0 };
      }
      return acc;
    }, {} as Record<ProblemType, { correct: number; total: number; averageTime: number }>);

    return {
      bestScore: gameStats.bestScore || 0,
      averageScore: gameStats.averageScore || 0,
      totalGames: gameStats.totalGames || 0,
      averageResponseTime: gameStats.averageResponseTime || 0,
      totalResponses: gameStats.totalResponses || 0,
      lastGameStats: gameStats.lastGameStats,
      problemTypes
    };
  };

  const handleReturnToGame = () => {
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-white text-xl">Chargement des statistiques...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-red-400 text-xl bg-white/10 backdrop-blur-sm rounded-lg p-4">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Tableau de bord</h1>
          <button
            onClick={handleReturnToGame}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Statistiques globales */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Trophy className="mr-2 text-yellow-400" />
              Statistiques globales
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Meilleur score:</span>
                <span className="font-bold">{stats.bestScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Score moyen:</span>
                <span className="font-bold">{stats.averageScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Temps de réponse moyen:</span>
                <span className="font-bold">{stats.averageResponseTime.toFixed(2)}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total des réponses:</span>
                <span className="font-bold">{stats.totalResponses}</span>
              </div>
            </div>
          </div>

          {/* Dernière partie */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Clock className="mr-2 text-blue-400" />
              Dernière partie
            </h2>
            {stats.lastGameStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Score:</span>
                  <span className="font-bold">{stats.lastGameStats.score}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Niveau atteint:</span>
                  <span className="font-bold">{stats.lastGameStats.level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Précision:</span>
                  <span className="font-bold">
                    {((stats.lastGameStats.correctAnswers / stats.lastGameStats.totalAttempts) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Temps de réponse moyen:</span>
                  <span className="font-bold">{stats.lastGameStats.averageResponseTime.toFixed(2)}s</span>
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  {stats.lastGameStats.timestamp && (
                    <span>Joué le {new Date(stats.lastGameStats.timestamp).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">
                Aucune partie jouée récemment
              </div>
            )}
          </div>

          {/* Statistiques par type */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Target className="mr-2 text-blue-400" />
              Performance par type
            </h2>
            <div className="space-y-4">
              {Object.entries(stats.problemTypes).map(([type, data]) => {
                const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                return (
                  <div key={type} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium capitalize">{type}</h3>
                      <span className="text-sm opacity-75">{data.total} opérations</span>
                    </div>
                    <div className="relative h-2 bg-white/20 rounded-full mb-2">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-400 to-blue-400"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Précision: {accuracy.toFixed(1)}%</span>
                      <span>Temps: {data.averageTime.toFixed(1)}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};