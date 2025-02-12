import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { GameSession } from '../models/Game';
import { Problem, ProblemType } from '../types/game';

const calculatePoints = (timeSpent: number, level: number): number => {
  const basePoints = 10;
  const timeBonus = Math.max(0, 5 - timeSpent / 1000) * 2;
  return Math.round((basePoints + timeBonus) * level);
};

const shouldLevelUp = (score: number): boolean => {
  const nextLevelThreshold = Math.pow(score, 1.1) + 100;
  return score >= nextLevelThreshold;
};

const generateProblem = (level: number): Problem => {
  const types: ProblemType[] = ['addition', 'subtraction', 'multiplication', 'division', 'puissance', 'algebre'];
  const type = types[Math.floor(Math.random() * (Math.min(level, types.length)))];
  
  let num1: number, num2: number, answer: number, expression: string;
  
  switch (type) {
    case 'addition':
      num1 = Math.floor(Math.random() * (10 * level)) + 1;
      num2 = Math.floor(Math.random() * (10 * level)) + 1;
      answer = num1 + num2;
      expression = `${num1} + ${num2}`;
      break;
    case 'subtraction':
      num1 = Math.floor(Math.random() * (10 * level)) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
      expression = `${num1} - ${num2}`;
      break;
    case 'multiplication':
      num1 = Math.floor(Math.random() * (5 * level)) + 1;
      num2 = Math.floor(Math.random() * (5 * level)) + 1;
      answer = num1 * num2;
      expression = `${num1} × ${num2}`;
      break;
    case 'division':
      num2 = Math.floor(Math.random() * (5 * level)) + 1;
      answer = Math.floor(Math.random() * (5 * level)) + 1;
      num1 = num2 * answer;
      expression = `${num1} ÷ ${num2}`;
      break;
    case 'puissance':
      num1 = Math.floor(Math.random() * (3 * level)) + 1;
      num2 = Math.floor(Math.random() * 3) + 1;
      answer = Math.pow(num1, num2);
      expression = `${num1}^${num2}`;
      break;
    default: // algebre
      answer = Math.floor(Math.random() * (10 * level)) + 1;
      num2 = Math.floor(Math.random() * (10 * level)) + 1;
      num1 = answer + num2;
      expression = `x + ${num2} = ${num1}`;
  }
  
  return {
    type,
    expression,
    answer,
    id: `${type}_${Date.now()}`
  };
};

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<Problem>(generateProblem(1));
  const [userAnswer, setUserAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  
  const gridSize = Math.min(5 + Math.floor(level / 3), 10);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState({ x: gridSize - 1, y: gridSize - 1 });

  useEffect(() => {
    setGameSession(new GameSession());
    setCurrentProblem(generateProblem(1));
  }, []);

  const handleCorrectAnswer = (timeSpent: number) => {
    const points = calculatePoints(timeSpent, level);
    setScore(prevScore => {
      const newScore = prevScore + points;
      gameSession?.updateScore(newScore);
      return newScore;
    });

    gameSession?.recordProblemAttempt(
      currentProblem.type,
      currentProblem.expression,
      currentProblem.answer,
      parseInt(userAnswer),
      timeSpent,
      true
    );

    if (shouldLevelUp(score)) {
      setLevel(prevLevel => {
        const newLevel = prevLevel + 1;
        gameSession?.updateLevel(newLevel);
        return newLevel;
      });
    }
  };

  const handleWrongAnswer = (timeSpent: number) => {
    gameSession?.recordProblemAttempt(
      currentProblem.type,
      currentProblem.expression,
      currentProblem.answer,
      parseInt(userAnswer),
      timeSpent,
      false
    );
  };

  const handleGameOver = async (forced: boolean = false) => {
    setGameOver(true);
    if (gameSession) {
      try {
        const finalStats = await gameSession.endGame(forced);
        navigate('/dashboard', { state: { gameStats: finalStats } });
      } catch (error) {
        console.error('Error ending game:', error);
      }
    }
  };

  const handleQuit = () => {
    handleGameOver(true);
  };

  const handleAnswer = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const answer = parseInt(userAnswer);
    const correct = answer === currentProblem.answer;

    if (correct) {
      handleCorrectAnswer(responseTime);
      setMessage(`Correct! (${(responseTime / 1000).toFixed(1)}s) Move to the target.`);
    } else {
      handleWrongAnswer(responseTime);
      setMessage(`Wrong answer! (${(responseTime / 1000).toFixed(1)}s) Try again!`);
    }

    setUserAnswer('');
    setCurrentProblem(generateProblem(level));
    setStartTime(Date.now());
  }, [currentProblem, userAnswer, startTime, level, gameSession]);

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
      setTargetPos({ x: gridSize - 1, y: gridSize - 1 });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Level {level}</h2>
              <p className="text-lg">Score: {score}</p>
            </div>
            <button
              onClick={handleQuit}
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
                  <h3 className="text-xl font-bold">{currentProblem?.expression}</h3>
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
            {/* Cognitive Chat */}
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* AI Chat */}
          </div>
        </div>
      </div>
    </div>
  );
};
