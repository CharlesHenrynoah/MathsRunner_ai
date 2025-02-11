import React, { useEffect, useState } from 'react';
import { GameStats, ProblemType } from '../types/game';
import { userStatsService } from '../services/userStatsService';
import { authService } from '../services/authService';
import { Brain, Trophy, BarChart2 } from 'lucide-react';

interface DashboardProps {
  gameStats: GameStats;
  onReturnToGame: () => void;
}

interface GlobalStats {
  bestScore: number;
  averageScore: number;
  totalGames: number;
  averageResponseTime: number;
  problemTypeStats: Record<ProblemType, { correct: number; total: number }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ gameStats, onReturnToGame }) => {
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    bestScore: 0,
    averageScore: 0,
    totalGames: 0,
    averageResponseTime: 0,
    problemTypeStats: {} as Record<ProblemType, { correct: number; total: number }>,
  });
  const currentUser = authService.getCurrentUser();
  const pseudo = currentUser ? currentUser.pseudo : 'Joueur';

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await userStatsService.getGlobalStats();
        setGlobalStats(stats);
      } catch (error) {
        console.error('Erreur lors du chargement des stats:', error);
      }
    };
    loadStats();
  }, []);

  const formatPercentage = (correct: number, total: number) => {
    if (total === 0) return '0%';
    return ((correct / total) * 100).toFixed(1) + '%';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
          <button
            onClick={onReturnToGame}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retour au jeu
          </button>
        </div>

        {/* Message de bienvenue */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Salut {pseudo} ! 👋
          </h1>
          <p className="text-gray-200">
            Voici tes statistiques de jeu
          </p>
        </div>

        {/* Dernière partie */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Dernière partie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Score</p>
              <p className="text-2xl font-bold">{gameStats.score}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Niveau atteint</p>
              <p className="text-2xl font-bold">{gameStats.level}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Réponses correctes</p>
              <p className="text-2xl font-bold">{gameStats.correctAnswers}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Temps moyen de réponse</p>
              <p className="text-2xl font-bold">{Math.round(gameStats.averageResponseTime / 1000)}s</p>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
            <BarChart2 className="w-6 h-6 text-blue-500" />
            Statistiques globales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Meilleur score</p>
              <p className="text-2xl font-bold">{globalStats.bestScore}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Score moyen</p>
              <p className="text-2xl font-bold">{Math.round(globalStats.averageScore)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Parties jouées</p>
              <p className="text-2xl font-bold">{globalStats.totalGames}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Temps moyen de réponse</p>
              <p className="text-2xl font-bold">{Math.round(globalStats.averageResponseTime / 1000)}s</p>
            </div>
          </div>
        </div>

        {/* Performance par type */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
            <Brain className="w-6 h-6 text-green-500" />
            Performance par type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(globalStats.problemTypeStats).map(([type, stats]) => (
              <div key={type} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 capitalize mb-2">{type}</h3>
                <div className="flex flex-col space-y-2">
                  <p className="text-gray-600">
                    {formatPercentage(stats.correct, stats.total)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.correct} / {stats.total} {stats.total === 1 ? 'réponse correcte' : 'réponses correctes'}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{
                        width: `${stats.total > 0 ? (stats.correct / stats.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};