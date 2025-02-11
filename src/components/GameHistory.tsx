import { FC, useState } from 'react';
import { Download } from 'lucide-react';
import { GameStats } from '../types/game';
import { formatGameStatsToCSV, convertToCSV } from '../utils/gameHistory';

interface GameHistoryProps {
  history: GameStats[];
}

export const GameHistory: FC<GameHistoryProps> = ({ history }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || history.length === 0) return;
    
    setIsExporting(true);
    const session = formatGameStatsToCSV(history[0]);
    const csvContent = convertToCSV(session);
    
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 'game_history.csv');
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting game history:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Historique des parties</h2>
      {history.length === 0 ? (
        <p className="text-gray-500">Aucune partie jouée pour le moment</p>
      ) : (
        <div className="space-y-2">
          {history.map((game, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Niveau atteint : {game.level}</p>
                  <p className="text-gray-600">Score : {game.score}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    Précision : {((game.correctAnswers / game.totalAttempts) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">
                    Temps moyen : {game.averageResponseTime.toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 ${
              isExporting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-4 py-2 rounded-lg transition`}
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Export Game History'}
          </button>
        </div>
      )}
    </div>
  );
};
