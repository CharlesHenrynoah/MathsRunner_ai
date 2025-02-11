import React, { useEffect, useState } from 'react';
import { GameStats } from '../types/game';
import { authService } from '../services/authService';
import { csvManager } from '../utils/csvManager';
import { ArrowLeft, Download } from 'lucide-react';

interface DashboardProps {
  gameStats: GameStats;
  onReturn: () => void;
}

interface GameHistoryItem {
  gameId: string;
  timestamp: string;
  level: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  averageResponseTime: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ gameStats, onReturn }) => {
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const user = authService.getCurrentUser();

  useEffect(() => {
    const loadGameHistory = () => {
      if (user?.id) {
        const userGames = csvManager.getUserGames(user.id);
        setGameHistory(userGames.map(game => ({
          gameId: game.gameId,
          timestamp: game.timestamp,
          level: game.level,
          score: game.score,
          correctAnswers: game.correctAnswers,
          totalAttempts: game.totalAttempts,
          averageResponseTime: game.averageResponseTime
        })));
      }
    };

    loadGameHistory();
  }, [user?.id]);

  const handleExportData = () => {
    if (!user) return;

    const csvData = csvManager.exportUserData(user.id);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mathrunner_stats_${user.username}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onReturn}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au jeu
        </button>
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Exporter mes données
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistiques actuelles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Niveau atteint"
            value={gameStats.level}
          />
          <StatCard
            title="Score"
            value={gameStats.score}
          />
          <StatCard
            title="Précision"
            value={`${Math.round((gameStats.correctAnswers / gameStats.totalAttempts) * 100 || 0)}%`}
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Historique des parties</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Précision</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps moyen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gameHistory.map((game) => (
                <tr key={game.gameId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {game.level}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {game.score}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.round((game.correctAnswers / game.totalAttempts) * 100)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {game.averageResponseTime.toFixed(2)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number | string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => (
  <div className="bg-gray-50 p-6 rounded-lg">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
  </div>
);