import React, { useState, useEffect, useCallback } from 'react';
import { Brain, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { CognitiveChat } from './components/CognitiveChat';
import { AIChat } from './components/AIChat';
import { Dashboard } from './components/Dashboard';
import { GameStats } from './types/game';

type Position = {
  x: number;
  y: number;
};

type Problem = {
  question: string;
  answer: number;
};

function App() {
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState<Position>({ x: 2, y: 2 });
  const [gauge, setGauge] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [gridSize, setGridSize] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [totalResponseTime, setTotalResponseTime] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [showDashboard, setShowDashboard] = useState(false);
  const [problemTypes, setProblemTypes] = useState<Record<string, { correct: number; total: number }>>({
    addition: { correct: 0, total: 0 },
    subtraction: { correct: 0, total: 0 },
    multiplication: { correct: 0, total: 0 },
    division: { correct: 0, total: 0 },
    power: { correct: 0, total: 0 },
    algebraic: { correct: 0, total: 0 }
  });

  const generateNewTarget = useCallback(() => {
    let newX, newY;
    do {
      newX = Math.floor(Math.random() * gridSize);
      newY = Math.floor(Math.random() * gridSize);
    } while (newX === playerPos.x && newY === playerPos.y);
    setTargetPos({ x: newX, y: newY });
  }, [playerPos, gridSize]);

  const generateProblem = useCallback(() => {
    const getNumberRange = () => {
      if (level <= 5) return 10;
      if (level <= 10) return 20;
      if (level <= 15) return 50;
      return 100;
    };

    const getAvailableOperations = () => {
      if (level <= 3) return ['+'];
      if (level <= 6) return ['+', '-'];
      if (level <= 10) return ['+', '-', '*'];
      if (level <= 15) return ['+', '-', '*', '/'];
      return ['+', '-', '*', '/', '^'];
    };

    const operations = getAvailableOperations();
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const range = getNumberRange();
    
    let num1 = Math.floor(Math.random() * range) + 1;
    let num2 = Math.floor(Math.random() * range) + 1;
    let problemType = '';

    switch (operation) {
      case '-':
        num1 = Math.max(num1, num2);
        problemType = 'subtraction';
        break;
      case '/':
        num2 = Math.min(num2, 10);
        num1 = num2 * (Math.floor(Math.random() * 10) + 1);
        problemType = 'division';
        break;
      case '^':
        num1 = Math.min(num1, 10);
        num2 = Math.min(num2, 3);
        problemType = 'power';
        break;
      case '*':
        problemType = 'multiplication';
        break;
      case '+':
        problemType = 'addition';
        break;
    }

    let answer: number;
    let question: string;

    if (level >= 20) {
      const x = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      answer = x;
      question = `${b} + x = ${b + x}`;
      problemType = 'algebraic';
    } else {
      switch (operation) {
        case '+':
          answer = num1 + num2;
          question = `${num1} + ${num2} = ?`;
          break;
        case '-':
          answer = num1 - num2;
          question = `${num1} - ${num2} = ?`;
          break;
        case '*':
          answer = num1 * num2;
          question = `${num1} × ${num2} = ?`;
          break;
        case '/':
          answer = num1 / num2;
          question = `${num1} ÷ ${num2} = ?`;
          break;
        case '^':
          answer = Math.pow(num1, num2);
          question = `${num1}^${num2} = ?`;
          break;
        default:
          answer = 0;
          question = 'Error';
      }
    }

    setProblemTypes(prev => ({
      ...prev,
      [problemType]: {
        ...prev[problemType],
        total: prev[problemType].total + 1
      }
    }));

    setStartTime(Date.now());
    return { question, answer, type: problemType };
  }, [level]);

  useEffect(() => {
    if (!currentProblem) {
      const newProblem = generateProblem();
      setCurrentProblem(newProblem);
    }

    const getGaugeSpeed = () => {
      const baseSpeed = 150;
      
      // Significantly slow down the game at level 8
      if (level === 8) {
        return 300; // Double the base speed (slower)
      }
      
      // For other levels, use a modified progression
      const speedReduction = Math.min(100, level * 5);
      const speed = Math.max(50, baseSpeed - speedReduction);
      
      // Additional slowdown for levels 7-9 to create a smoother transition
      if (level === 7) return speed * 1.5;
      if (level === 9) return speed * 0.75;
      
      return speed;
    };

    const gaugeInterval = setInterval(() => {
      if (!gameOver) {
        setGauge(prev => {
          if (prev >= 100) {
            setGameOver(true);
            return 100;
          }
          return prev + 1;
        });
      }
    }, getGaugeSpeed());

    return () => clearInterval(gaugeInterval);
  }, [gameOver, currentProblem, generateProblem, level]);

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    const moves = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };

    const newPos = {
      x: Math.max(0, Math.min(gridSize - 1, playerPos.x + moves[direction].x)),
      y: Math.max(0, Math.min(gridSize - 1, playerPos.y + moves[direction].y))
    };

    setPlayerPos(newPos);

    if (newPos.x === targetPos.x && newPos.y === targetPos.y) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setGauge(0);
      
      if (newLevel % 4 === 0 && gridSize < 8) {
        setGridSize(prev => prev + 1);
      }
      
      setScore(prev => prev + 20);
      setMessage(`Target reached! Level ${newLevel} 🎯`);
      generateNewTarget();
    }
  };

  const handleAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem) return;

    const responseTime = Date.now() - startTime;
    setTotalResponseTime(prev => prev + responseTime);
    setTotalAttempts(prev => prev + 1);

    const numAnswer = parseInt(userAnswer);
    if (numAnswer === currentProblem.answer) {
      setScore(prev => prev + 10);
      setGauge(prev => Math.max(0, prev - 20));
      setMessage('Correct! 🎉');
      setCorrectAnswers(prev => prev + 1);
      
      setProblemTypes(prev => ({
        ...prev,
        [currentProblem.type]: {
          ...prev[currentProblem.type],
          correct: prev[currentProblem.type].correct + 1
        }
      }));

      const newProblem = generateProblem();
      setCurrentProblem(newProblem);
      setUserAnswer('');
    } else {
      setGauge(prev => prev + 10);
      setMessage('Wrong answer! Try again ❌');
    }
  };

  const restartGame = () => {
    setPlayerPos({ x: 0, y: 0 });
    setTargetPos({ x: 2, y: 2 });
    setGauge(0);
    setScore(0);
    setLevel(1);
    setGridSize(3);
    setGameOver(false);
    setCurrentProblem(generateProblem());
    setUserAnswer('');
    setMessage('');
    setCorrectAnswers(0);
    setTotalAttempts(0);
    setTotalResponseTime(0);
    setProblemTypes({
      addition: { correct: 0, total: 0 },
      subtraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
      power: { correct: 0, total: 0 },
      algebraic: { correct: 0, total: 0 }
    });
  };

  const gameStats: GameStats = {
    level,
    score,
    correctAnswers,
    totalAttempts,
    averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
    problemTypes
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      {showDashboard ? (
        <Dashboard gameStats={gameStats} />
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-800">Math Runner</h1>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDashboard(true)}
                className="bg-purple-100 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-200 transition"
              >
                View Stats
              </button>
              <div className="text-xl font-semibold text-purple-600">
                Level: {level}
              </div>
              <div className="text-xl font-semibold text-purple-600">
                Score: {score}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="h-full bg-red-500 rounded-full transition-all duration-300"
                style={{ width: `${gauge}%` }}
              ></div>
            </div>
          </div>

          {gameOver ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Game Over!</h2>
              <p className="text-xl mb-4">Final Score: {score}</p>
              <p className="text-lg mb-4">Level Reached: {level}</p>
              <button
                onClick={restartGame}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Play Again
              </button>
            </div>
          ) : (
            <>
              <div className={`grid gap-1 mb-6 bg-gray-100 p-2 rounded-lg mx-auto`} 
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
      )}
      <CognitiveChat gameStats={gameStats} />
      <AIChat gameStats={gameStats} />
    </div>
  );
}

export default App;