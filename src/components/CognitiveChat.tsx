import React, { useEffect, useState } from 'react';
import { GameStats } from '../types/game';
import { Brain, Lightbulb, X } from 'lucide-react';

interface CognitiveChatProps {
  gameStats: GameStats;
  onClose: () => void;
}

interface Advice {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'info';
}

export const CognitiveChat: React.FC<CognitiveChatProps> = ({ gameStats, onClose }) => {
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [lastAdviceTime, setLastAdviceTime] = useState(Date.now());

  const generateAdvice = () => {
    const accuracy = gameStats.totalAttempts > 0
      ? (gameStats.correctAnswers / gameStats.totalAttempts) * 100
      : 0;

    const avgResponseTime = gameStats.totalAttempts > 0
      ? gameStats.averageResponseTime / 1000
      : 0;

    const possibleAdvices: Advice[] = [
      {
        id: Date.now(),
        message: "Prenez votre temps pour répondre. La précision est plus importante que la vitesse.",
        type: accuracy < 70 ? 'warning' : 'info'
      },
      {
        id: Date.now() + 1,
        message: "Visualisez le problème avant de répondre.",
        type: 'info'
      },
      {
        id: Date.now() + 2,
        message: `Votre temps moyen est de ${avgResponseTime.toFixed(1)}s. Essayez de maintenir un rythme régulier.`,
        type: avgResponseTime > 10 ? 'warning' : 'success'
      }
    ];

    Object.entries(gameStats.problemTypes).forEach(([type, stats]) => {
      if (stats.total > 0) {
        const opAccuracy = (stats.correct / stats.total) * 100;
        if (opAccuracy < 60) {
          let advice = '';
          switch (type) {
            case 'addition':
              advice = "Pour les additions, regroupez les nombres par dizaines.";
              break;
            case 'subtraction':
              advice = "Pour les soustractions, pensez à la distance entre les nombres.";
              break;
            case 'multiplication':
              advice = "Apprenez les tables de multiplication par cœur jusqu'à 12.";
              break;
            case 'division':
              advice = "Pour les divisions, pensez aux tables de multiplication à l'envers.";
              break;
            case 'puissance':
              advice = "Mémorisez les carrés parfaits jusqu'à 12².";
              break;
            case 'algebre':
              advice = "Dans les équations, isolez d'abord l'inconnue d'un côté.";
              break;
          }
          possibleAdvices.push({
            id: Date.now() + possibleAdvices.length,
            message: advice,
            type: 'warning'
          });
        }
      }
    });

    const randomAdvice = possibleAdvices[Math.floor(Math.random() * possibleAdvices.length)];
    setAdvices(prev => [...prev, randomAdvice].slice(-5));
    setLastAdviceTime(Date.now());
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastAdviceTime >= 10000) {
        generateAdvice();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastAdviceTime, gameStats]);

  useEffect(() => {
    generateAdvice();
  }, []);

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-purple-600 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold">Coach Cognitif</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-white hover:text-purple-200">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="max-h-60 overflow-y-auto p-4 space-y-3">
        {advices.map((advice) => (
          <div
            key={advice.id}
            className={`flex items-start gap-2 p-2 rounded ${
              advice.type === 'success' ? 'bg-green-50' :
              advice.type === 'warning' ? 'bg-yellow-50' :
              'bg-blue-50'
            }`}
          >
            <Lightbulb className={`w-4 h-4 mt-0.5 ${
              advice.type === 'success' ? 'text-green-500' :
              advice.type === 'warning' ? 'text-yellow-500' :
              'text-blue-500'
            }`} />
            <p className={`text-sm ${
              advice.type === 'success' ? 'text-green-700' :
              advice.type === 'warning' ? 'text-yellow-700' :
              'text-blue-700'
            }`}>
              {advice.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};