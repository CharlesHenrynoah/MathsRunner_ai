import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { GameStats } from '../types/game';
import { generateMathProblem } from '../utils/mathProblems';
import { CognitiveChat } from './CognitiveChat';
import { AIChat } from './AIChat';

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(generateMathProblem(1));
  const [userAnswer, setUserAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [gameStats, setGameStats] = useState<GameStats>({
    level: 1,
    score: 0,
    totalAttempts: 0,
    correctAnswers: 0,
    averageResponseTime: 0,
    problemTypes: {}
  });

  const gridSize = Math.min(5 + Math.floor(level / 3), 10);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState({ 
    x: gridSize - 1, 
    y: gridSize - 1 
  });

  const handleAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = parseInt(userAnswer);
    const correct = answer === currentProblem.answer;

    setGameStats(prev => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
      correctAnswers: correct ? prev.correctAnswers + 1 : prev.correctAnswers,
      problemTypes: {
        ...prev.problemTypes,
        [currentProblem.type]: {
          correct: (prev.problemTypes[currentProblem.type]?.correct || 0) + (correct ? 1 : 0),
          total: (prev.problemTypes[currentProblem.type]?.total || 0) + 1
        }
      }
    }));

    if (correct) {
      setScore(s => s + level * 10);
      setMessage('Correct! Move to the target.');
      setCurrentProblem(generateMathProblem(level));
    } else {
      setMessage('Wrong answer, try again!');
    }
    setUserAnswer('');
  };

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    setPlayerPos(prev => {
      const newPos = { ...prev };
      switch (direction) {
        case 'up':
          if (prev.y > 0) newPos.y--;
          break;
        case 'down':
          if (prev.y < gridSize - 1) newPos.y++;
          break;
        case 'left':
          if (prev.x > 0) newPos.x--;
          break;
        case 'right':
          if (prev.x < gridSize - 1) newPos.x++;
          break;
      }
      return newPos;
    });
  };

  useEffect(() => {
    if (playerPos.x === targetPos.x && playerPos.y === targetPos.y) {
      setLevel(l => l + 1);
      setPlayerPos({ x: 0, y: 0 });
      setTargetPos({ 
        x: gridSize - 1, 
        y: gridSize - 1 
      });
      setMessage('');
    }
  }, [playerPos, targetPos, gridSize]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          handleMove('up');
          break;
        case 'ArrowDown':
          handleMove('down');
          break;
        case 'ArrowLeft':
          handleMove('left');
          break;
        case 'ArrowRight':
          handleMove('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    const finalStats: GameStats = {
      ...gameStats,
      level,
      score
    };
    navigate('/dashboard', { state: { gameStats: finalStats } });
  }, [gameStats, level, score, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Level: {level}</h2>
              <p className="text-lg">Score: {score}</p>
            </div>
            <button
              onClick={handleGameOver}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              End Game
            </button>
          </div>

          {gameOver ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Game Over!</h2>
              <p className="text-xl mb-4">Final Score: {score}</p>
              <p className="text-lg mb-4">Level Reached: {level}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Play Again
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-1 mb-6 bg-gray-100 p-2 rounded-lg mx-auto"
                   style={{ 
                     gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                     width: 'fit-content'
                   }}>
                {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                  const x = index % gridSize;
                  const y = Math.floor(index / gridSize);
                  const isPlayer = x === playerPos.x && y === playerPos.y;
                  const isTarget = x === targetPos.x && y === targetPos.y;

                  return (
                    <div
                      key={index}
                      className={`w-16 h-16 rounded flex items-center justify-center ${
                        isPlayer ? 'bg-purple-600' : 
                        isTarget ? 'bg-red-500' : 
                        'bg-gray-200'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="mb-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">{currentProblem?.question}</h3>
                  {message && (
                    <p className={message.includes('Wrong') ? 'text-red-600' : 'text-green-600'}>
                      {message}
                    </p>
                  )}
                </div>
                <form onSubmit={handleAnswer} className="flex gap-2">
                  <input
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter your answer"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    Submit
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <button
                  onClick={() => handleMove('up')}
                  className="col-start-2 bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                >
                  <ArrowUp className="w-6 h-6 mx-auto" />
                </button>
                <button
                  onClick={() => handleMove('left')}
                  className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                >
                  <ArrowLeft className="w-6 h-6 mx-auto" />
                </button>
                <button
                  onClick={() => handleMove('down')}
                  className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                >
                  <ArrowDown className="w-6 h-6 mx-auto" />
                </button>
                <button
                  onClick={() => handleMove('right')}
                  className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                >
                  <ArrowRight className="w-6 h-6 mx-auto" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <CognitiveChat gameStats={gameStats} />
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <AIChat gameStats={gameStats} />
          </div>
        </div>
      </div>
    </div>
  );
};
