import React, { useState } from 'react';
import { GameStats } from '../types/game';
import { Bot, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  gameStats: GameStats;
}

export const AIChat: React.FC<AIChatProps> = ({ gameStats }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateInitialContext = () => {
    const accuracy = gameStats.totalAttempts > 0
      ? (gameStats.correctAnswers / gameStats.totalAttempts) * 100
      : 0;

    const avgResponseTime = gameStats.totalAttempts > 0
      ? gameStats.averageResponseTime / 1000
      : 0;

    return `
      Statistiques actuelles :
      - Score: ${gameStats.score}
      - Niveau: ${gameStats.level}
      - Précision: ${accuracy.toFixed(1)}%
      - Temps moyen: ${avgResponseTime.toFixed(2)}s
      - Bonnes réponses: ${gameStats.correctAnswers}/${gameStats.totalAttempts}
    `;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Simuler une réponse de l'IA (à remplacer par une vraie API)
      const context = generateInitialContext();
      const response = await simulateAIResponse(userMessage, context);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Erreur lors de la réponse IA:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, je rencontre des difficultés. Réessayez plus tard.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateAIResponse = async (message: string, context: string): Promise<string> => {
    // Simuler un délai de réponse
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Analyser le message et générer une réponse appropriée
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('améliorer')) {
      return `D'après vos statistiques, voici mes suggestions d'amélioration :
1. Concentrez-vous sur la précision (${(gameStats.correctAnswers / gameStats.totalAttempts * 100).toFixed(1)}%)
2. Essayez de réduire votre temps de réponse (${(gameStats.averageResponseTime / 1000).toFixed(2)}s)
3. Pratiquez régulièrement pour progresser`;
    }
    
    if (messageLower.includes('niveau') || messageLower.includes('level')) {
      return `Vous êtes actuellement au niveau ${gameStats.level}. Pour passer au niveau suivant, essayez de :
1. Maintenir une précision élevée
2. Répondre plus rapidement
3. Enchaîner les bonnes réponses`;
    }
    
    if (messageLower.includes('score')) {
      return `Votre score actuel est de ${gameStats.score} points. Voici comment l'améliorer :
1. Visez la précision plutôt que la vitesse
2. Essayez d'atteindre des niveaux plus élevés
3. Évitez les erreurs consécutives`;
    }

    return `Je suis là pour vous aider à progresser. Vous pouvez me poser des questions sur :
- Vos statistiques actuelles
- Comment améliorer votre score
- Des conseils pour monter de niveau
- Des stratégies spécifiques`;
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question à l'assistant..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};