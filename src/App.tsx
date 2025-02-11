import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Brain, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, LogOut } from 'lucide-react';
import { CognitiveChat } from './components/CognitiveChat';
import { AIChat } from './components/AIChat';
import { Dashboard } from './components/Dashboard';
import { GameStats } from './types/game';
import { User } from './types/auth';
import { authService } from './services/authService';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { saveGameHistoryToLocalStorage } from './utils/localStorage';
import { saveGameSession } from './utils/gameHistory';
import { saveGameStats, updateMaxLevels } from './utils/statsHistory';
import { csvManager } from './utils/csvManager'; // Import csvManager

type Position = {
  x: number;
  y: number;
};

type Problem = {
  question: string;
  answer: number;
  type: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'power' | 'algebraic';
};

const DEFAULT_GAME_STATS = {
  level: 1,
  score: 0,
  correctAnswers: 0,
  totalAttempts: 0,
  averageResponseTime: 0,
  problemTypes: {
    addition: { correct: 0, total: 0 },
    subtraction: { correct: 0, total: 0 },
    multiplication: { correct: 0, total: 0 },
    division: { correct: 0, total: 0 },
    power: { correct: 0, total: 0 },
    algebraic: { correct: 0, total: 0 }
  }
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>(DEFAULT_GAME_STATS);
  const [showDashboard, setShowDashboard] = useState(false);
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
  const [problemTypes, setProblemTypes] = useState<Record<string, { correct: number; total: number }>>({
    addition: { correct: 0, total: 0 },
    subtraction: { correct: 0, total: 0 },
    multiplication: { correct: 0, total: 0 },
    division: { correct: 0, total: 0 },
    power: { correct: 0, total: 0 },
    algebraic: { correct: 0, total: 0 }
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setShowLogin(false);
      setShowRegister(false);
    }
  }, []);

  const handleLogin = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleRegister = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setShowLogin(true);
    setShowRegister(false);
    setShowDashboard(false);
  };

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
    let problemType: Problem['type'] = 'addition';

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

  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    const finalStats: GameStats = {
      level,
      score,
      correctAnswers,
      totalAttempts,
      averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
      problemTypes
    };

    // Sauvegarder les statistiques finales
    saveGameStats(finalStats);
    saveGameHistoryToLocalStorage(finalStats);
    
    try {
      await saveGameSession(finalStats);
    } catch (error) {
      console.error('Failed to save game session to file:', error);
    }
  }, [level, score, correctAnswers, totalAttempts, totalResponseTime, problemTypes]);

  const getGaugeSpeed = useCallback(() => {
    const baseSpeed = 150;
    
    if (level === 8) {
      return 300;
    }
    
    const speedReduction = Math.min(100, level * 5);
    const speed = Math.max(50, baseSpeed - speedReduction);
    
    if (level === 7) return speed * 1.5;
    if (level === 9) return speed * 0.75;
    
    return speed;
  }, [level]);

  useEffect(() => {
    if (!currentProblem) {
      const newProblem = generateProblem();
      setCurrentProblem(newProblem);
    }
  }, [currentProblem, generateProblem]);

  useEffect(() => {
    if (!gameOver) {
      const gaugeInterval = setInterval(() => {
        setGauge(prev => {
          const newValue = prev + 1;
          if (newValue >= 100) {
            clearInterval(gaugeInterval);
            handleGameOver();
            return 100;
          }
          return newValue;
        });
      }, getGaugeSpeed());

      return () => clearInterval(gaugeInterval);
    }
  }, [gameOver, getGaugeSpeed]);

  useEffect(() => {
    if (gameOver && user) {
      const finalStats: GameStats = {
        level,
        score,
        correctAnswers,
        totalAttempts,
        averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
        problemTypes
      };
      
      setGameStats(finalStats);
      // Sauvegarder dans le CSV des parties
      csvManager.addGameRecord(user.id, finalStats);
    }
  }, [gameOver, user, level, score, correctAnswers, totalAttempts, totalResponseTime, problemTypes]);

  const currentGameStats: GameStats = useMemo(() => ({
    level,
    score,
    correctAnswers,
    totalAttempts,
    averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
    problemTypes
  }), [level, score, correctAnswers, totalAttempts, totalResponseTime, problemTypes]);

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
      const newScore = score + 20;
      
      setLevel(newLevel);
      setGauge(0);
      setScore(newScore);
      setMessage(`Target reached! Level ${newLevel} 🎯`);
      
      if (newLevel % 4 === 0 && gridSize < 8) {
        setGridSize(prev => prev + 1);
      }
      
      generateNewTarget();
      
      // Sauvegarder les statistiques après avoir atteint la cible
      const currentStats: GameStats = {
        level: newLevel,
        score: newScore,
        correctAnswers,
        totalAttempts,
        averageResponseTime: totalAttempts > 0 ? totalResponseTime / totalAttempts : 0,
        problemTypes
      };
      
      saveGameStats(currentStats);
      updateMaxLevels(newLevel);
    }
  };

  const handleAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem) return;

    const responseTime = Date.now() - startTime;
    const newTotalResponseTime = totalResponseTime + responseTime;
    const newTotalAttempts = totalAttempts + 1;
    
    setTotalResponseTime(newTotalResponseTime);
    setTotalAttempts(newTotalAttempts);

    const numAnswer = parseInt(userAnswer);
    const isCorrect = numAnswer === currentProblem.answer;

    // Mettre à jour les statistiques
    const newProblemTypes = {
      ...problemTypes,
      [currentProblem.type]: {
        ...problemTypes[currentProblem.type],
        total: problemTypes[currentProblem.type].total + 1,
        correct: isCorrect ? problemTypes[currentProblem.type].correct + 1 : problemTypes[currentProblem.type].correct
      }
    };

    setProblemTypes(newProblemTypes);

    const newCorrectAnswers = isCorrect ? correctAnswers + 1 : correctAnswers;
    const newScore = isCorrect ? score + 10 : score;

    if (isCorrect) {
      setScore(newScore);
      setGauge(prev => Math.max(0, prev - 20));
      setMessage('Correct! 🎉');
      setCorrectAnswers(newCorrectAnswers);
      
      const newProblem = generateProblem();
      setCurrentProblem(newProblem);
      setUserAnswer('');
    } else {
      setGauge(prev => prev + 10);
      setMessage('Wrong answer! Try again ❌');
    }

    // Sauvegarder les statistiques après chaque réponse
    const currentStats: GameStats = {
      level,
      score: newScore,
      correctAnswers: newCorrectAnswers,
      totalAttempts: newTotalAttempts,
      averageResponseTime: newTotalResponseTime / newTotalAttempts,
      problemTypes: newProblemTypes
    };

    saveGameStats(currentStats);
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

  const navigate = useNavigate();

  const handleGameEnd = (stats: GameStats) => {
    setGameStats(stats);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} onRegisterClick={() => {
          setShowLogin(false);
          setShowRegister(true);
        }} />} />
        <Route path="/register" element={<Register onRegister={handleRegister} onLoginClick={() => {
          setShowRegister(false);
          setShowLogin(true);
        }} />} />
        <Route
          path="/game"
          element={
            <PrivateRoute>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user ? `Bienvenue, ${user.username}` : 'MathRunner'}
                  </h1>
                  <div className="flex items-center gap-4">
                    {user && (
                      <>
                        <button
                          onClick={() => setShowDashboard(true)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Statistiques
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <LogOut size={20} />
                          Déconnexion
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {showDashboard ? (
                  <Dashboard
                    gameStats={currentGameStats}
                    onReturn={() => setShowDashboard(false)}
                  />
                ) : (
                  <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
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
                    <CognitiveChat gameStats={currentGameStats} />
                    <AIChat gameStats={currentGameStats} />
                  </div>
                )}
              </div>
            </PrivateRoute>
          }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              authService.isAuthenticated() ? (
                <Navigate to="/game" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;