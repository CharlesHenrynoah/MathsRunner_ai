import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Brain, Bot, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { CognitiveChat } from './components/CognitiveChat';
import { AIChat } from './components/AIChat';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { GameStats, ProblemType } from './types/game';
import { authService } from './services/authService';
import { userStatsService } from './services/userStatsService';

interface Position {
  x: number;
  y: number;
}

interface Problem {
  question: string;
  answer: number;
  type: ProblemType;
}

const DEFAULT_GAME_STATS: GameStats = {
  score: 0,
  level: 1,
  correctAnswers: 0,
  totalAttempts: 0,
  averageResponseTime: 0,
  problemTypes: {
    addition: { correct: 0, total: 0 },
    subtraction: { correct: 0, total: 0 },
    multiplication: { correct: 0, total: 0 },
    division: { correct: 0, total: 0 },
    puissance: { correct: 0, total: 0 },
    algebre: { correct: 0, total: 0 }
  }
};

const generateProblem = (level: number): Problem => {
  let type: ProblemType;
  let num1: number, num2: number, num3: number, answer: number, question: string;

  switch (level) {
    case 1:
      // Niveau 1: Addition et soustraction simples (nombres jusqu'à 10)
      type = Math.random() < 0.5 ? 'addition' : 'subtraction';
      if (type === 'addition') {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
      } else {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        question = `${num1} - ${num2} = ?`;
      }
      break;

    case 2:
      // Niveau 2: Addition et soustraction plus complexes (nombres jusqu'à 20)
      type = Math.random() < 0.5 ? 'addition' : 'subtraction';
      if (type === 'addition') {
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
      } else {
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        question = `${num1} - ${num2} = ?`;
      }
      break;

    case 3:
      // Niveau 3: Multiplication et division simples
      type = Math.random() < 0.5 ? 'multiplication' : 'division';
      if (type === 'multiplication') {
        num1 = Math.floor(Math.random() * 5) + 1;
        num2 = Math.floor(Math.random() * 5) + 1;
        answer = num1 * num2;
        question = `${num1} × ${num2} = ?`;
      } else {
        num2 = Math.floor(Math.random() * 5) + 1; // diviseur
        answer = Math.floor(Math.random() * 5) + 1; // quotient
        num1 = num2 * answer; // dividende
        question = `${num1} ÷ ${num2} = ?`;
      }
      break;

    case 4:
      // Niveau 4: Multiplication et division plus complexes
      type = Math.random() < 0.5 ? 'multiplication' : 'division';
      if (type === 'multiplication') {
        num1 = Math.floor(Math.random() * 7) + 4;
        num2 = Math.floor(Math.random() * 7) + 4;
        answer = num1 * num2;
        question = `${num1} × ${num2} = ?`;
      } else {
        num2 = Math.floor(Math.random() * 7) + 4; // diviseur
        answer = Math.floor(Math.random() * 7) + 4; // quotient
        num1 = num2 * answer; // dividende
        question = `${num1} ÷ ${num2} = ?`;
      }
      break;

    case 5:
      // Niveau 5: Mélange d'opérations sur une ligne
      const operations = ['addition', 'multiplication', 'subtraction'];
      type = operations[Math.floor(Math.random() * operations.length)] as ProblemType;
      
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      num3 = Math.floor(Math.random() * 10) + 1;
      
      if (type === 'addition') {
        answer = num1 + num2 + num3;
        question = `${num1} + ${num2} + ${num3} = ?`;
      } else if (type === 'multiplication') {
        answer = num1 * num2;
        question = `${num1} × ${num2} + ${num3} = ?`;
        answer += num3;
      } else {
        answer = num1 - num2 + num3;
        question = `${num1} - ${num2} + ${num3} = ?`;
      }
      break;

    default:
      // Si niveau > 5, revenir au niveau 5
      return generateProblem(5);
  }

  return { question, answer, type };
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gameStats, setGameStats] = useState(DEFAULT_GAME_STATS);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState<Position>({ x: 2, y: 2 });
  const [gaugeValue, setGaugeValue] = useState<number>(100);
  const [gaugeSpeed, setGaugeSpeed] = useState<number>(0.2);
  const [gameOver, setGameOver] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [level, setLevel] = useState(1);
  const [showCognitiveChat, setShowCognitiveChat] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<Problem>(generateProblem(1));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemStartTime = useRef<number>(Date.now());
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const feedbackTimeout = useRef<number>();

  // Réinitialiser le temps de début quand un nouveau problème est généré
  useEffect(() => {
    problemStartTime.current = Date.now();
  }, [currentProblem]);

  const generateNewConfiguration = () => {
    // Générer une nouvelle position de cible aléatoire
    const newX = Math.floor(Math.random() * 5);
    const newY = Math.floor(Math.random() * 5);
    setTargetPos({ x: newX, y: newY });
  };

  const handleTargetReached = () => {
    // Ralentir la diminution de la barre pendant 3 secondes
    setGaugeSpeed(0.05); // Vitesse très lente
    setTimeout(() => {
      setGaugeSpeed(calculateGaugeDecrease(level)); // Retour à la vitesse normale
    }, 3000);
    
    // Générer une nouvelle configuration
    generateNewConfiguration();
  };

  const calculateGaugeDecrease = (level: number): number => {
    // La vitesse de diminution augmente avec le niveau
    const baseDecrease = 0.2;
    return baseDecrease + (level * 0.1);
  };

  useEffect(() => {
    if (!gameOver) {
      const interval = setInterval(() => {
        setGaugeValue(prev => {
          const newValue = prev - gaugeSpeed;
          if (newValue <= 0) {
            setGameOver(true);
            userStatsService.saveUserStats(gameStats);
            return 0;
          }
          return newValue;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [gameOver, gaugeSpeed]);

  useEffect(() => {
    // Mettre à jour la vitesse de la jauge quand le niveau change
    setGaugeSpeed(calculateGaugeDecrease(level));
  }, [level]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
    navigate('/');
  };

  const handleRegister = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
    navigate('/');
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setShowRegister(false);
    setGameStats(DEFAULT_GAME_STATS);
    navigate('/login');
  };

  const handleShowRegister = () => {
    setShowRegister(true);
  };

  const handleShowLogin = () => {
    setShowRegister(false);
  };

  const handleGameOver = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setGameOver(true);

    // On utilise directement les stats actuelles sans les modifier
    try {
      await userStatsService.saveUserStats(gameStats);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des statistiques:', error);
    }
  };

  const handleEndGame = async () => {
    await handleGameOver();
    navigate('/dashboard', { state: { gameStats } });
  };

  const handleReturnToGame = () => {
    setGameStats(DEFAULT_GAME_STATS);
    setGameOver(false);
    setGaugeValue(100);
    setLevel(1);
    setCurrentProblem(generateProblem(1));
    setPlayerPos({ x: 0, y: 0 });
    setTargetPos({ x: 2, y: 2 });
    navigate('/');
  };

  const showFeedback = (message: string) => {
    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
    setFeedbackMessage(message);
    feedbackTimeout.current = setTimeout(() => {
      setFeedbackMessage('');
    }, 1500);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = parseFloat(userAnswer);
    const endTime = Date.now();
    const responseTime = endTime - problemStartTime.current;
    
    const currentStats = {
      ...gameStats,
      problemTypes: {
        ...DEFAULT_GAME_STATS.problemTypes,
        ...gameStats.problemTypes
      }
    };
    
    if (answer === currentProblem.answer) {
      // Bonne réponse : points, progression de niveau et nouveau problème
      showFeedback('Correct !');
      const newStats = {
        ...currentStats,
        score: currentStats.score + (level * 10),
        correctAnswers: currentStats.correctAnswers + 1,
        totalAttempts: currentStats.totalAttempts + 1,
        averageResponseTime: (currentStats.averageResponseTime * currentStats.totalAttempts + responseTime) / (currentStats.totalAttempts + 1),
        problemTypes: {
          ...currentStats.problemTypes,
          [currentProblem.type]: {
            correct: (currentStats.problemTypes[currentProblem.type]?.correct || 0) + 1,
            total: (currentStats.problemTypes[currentProblem.type]?.total || 0) + 1
          }
        }
      };
      
      setGameStats(newStats);
      
      // Passage au niveau suivant après 10 opérations réussies
      if (newStats.correctAnswers % 10 === 0) {
        handleLevelUp();
      }

      // Réinitialiser la barre à 100% et générer un nouveau problème
      setGaugeValue(100);
      setCurrentProblem(generateProblem(level));
    } else {
      // Mauvaise réponse : comptabiliser la tentative et garder le même problème
      showFeedback('Incorrect !');
      const newStats = {
        ...currentStats,
        totalAttempts: currentStats.totalAttempts + 1,
        averageResponseTime: (currentStats.averageResponseTime * currentStats.totalAttempts + responseTime) / (currentStats.totalAttempts + 1),
        problemTypes: {
          ...currentStats.problemTypes,
          [currentProblem.type]: {
            correct: currentStats.problemTypes[currentProblem.type]?.correct || 0,
            total: (currentStats.problemTypes[currentProblem.type]?.total || 0) + 1
          }
        }
      };
      
      setGameStats(newStats);
    }

    problemStartTime.current = Date.now();
    setUserAnswer('');
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (gameOver) return;

    const newPos = { ...playerPos };

    switch (e.key) {
      case 'ArrowUp':
        if (newPos.y > 0) newPos.y -= 1;
        break;
      case 'ArrowDown':
        if (newPos.y < 4) newPos.y += 1;
        break;
      case 'ArrowLeft':
        if (newPos.x > 0) newPos.x -= 1;
        break;
      case 'ArrowRight':
        if (newPos.x < 4) newPos.x += 1;
        break;
      default:
        return;
    }

    setPlayerPos(newPos);

    if (newPos.x === targetPos.x && newPos.y === targetPos.y) {
      handleTargetReached();
    }
  };

  const handleLevelUp = () => {
    if (level < 5) { // Maximum 5 niveaux
      setLevel(prev => prev + 1);
      // Réinitialiser la barre et les stats pour le nouveau niveau
      setGaugeValue(100);
      setGameStats(prevStats => ({
        ...prevStats,
        problemTypes: {
          ...DEFAULT_GAME_STATS.problemTypes,
          ...prevStats.problemTypes
        }
      }));
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setIsAuthenticated(!!user);
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setCurrentProblem(generateProblem(1));
    }
  }, [navigate]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onRegister={handleRegister} onLoginClick={handleShowLogin} />;
    }
    return <Login onLogin={handleLogin} onRegisterClick={handleShowRegister} />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-8 h-8 text-white" />
                  <h1 className="text-3xl font-bold text-white">Math Runner</h1>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLogout}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition"
                  >
                    Déconnexion
                  </button>
                  <button
                    onClick={handleEndGame}
                    disabled={gameOver}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      gameOver 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    Terminer la partie
                  </button>
                  <div className="text-xl font-semibold text-white">
                    Niveau: {level}
                  </div>
                  <div className="text-xl font-semibold text-white">
                    Score: {gameStats.score}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="bg-white p-8 rounded-xl shadow-2xl">
                  <div className="mb-6">
                    {!gameOver && (
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${gaugeValue}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {gameOver ? (
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-red-600 mb-4">Partie terminée !</h2>
                      <p className="text-xl mb-4">Score final : {gameStats.score}</p>
                      <p className="text-lg mb-4">Niveau atteint : {level}</p>
                      <div className="space-y-2 mb-6">
                        <p className="text-gray-600">Bonnes réponses : {gameStats.correctAnswers}/{gameStats.totalAttempts}</p>
                        <p className="text-gray-600">Précision : {
                          gameStats.totalAttempts > 0 
                            ? ((gameStats.correctAnswers / gameStats.totalAttempts) * 100).toFixed(1) 
                            : 0
                        }%</p>
                        <p className="text-gray-600">Temps moyen de réponse : {
                          gameStats.totalAttempts > 0 
                            ? (gameStats.averageResponseTime / gameStats.totalAttempts / 1000).toFixed(2) 
                            : 0
                        }s</p>
                      </div>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={handleReturnToGame}
                          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
                        >
                          Nouvelle partie
                        </button>
                        <button
                          onClick={() => navigate('/dashboard', { state: { gameStats } })}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          Voir les statistiques
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-xl font-semibold">
                          Niveau: {level}
                        </div>
                        <div className="text-xl font-semibold">
                          Score: {gameStats.score}
                        </div>
                      </div>
                      <div 
                        className={`grid gap-1 mb-6 bg-gray-100 p-2 rounded-lg mx-auto`} 
                        style={{ 
                          gridTemplateColumns: `repeat(5, minmax(0, 1fr))`,
                          width: 'fit-content'
                        }}
                      >
                        {Array.from({ length: 25 }).map((_, index) => {
                          const x = index % 5;
                          const y = Math.floor(index / 5);
                          const isPlayer = x === playerPos.x && y === playerPos.y;
                          const isTarget = x === targetPos.x && y === targetPos.y;

                          return (
                            <div
                              key={index}
                              className={`w-16 h-16 flex items-center justify-center rounded-lg ${
                                isPlayer
                                  ? 'bg-blue-500'
                                  : isTarget
                                  ? 'bg-green-500'
                                  : 'bg-white'
                              }`}
                            >
                              {isPlayer && '🏃'}
                              {isTarget && '🎯'}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mb-6">
                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold">{currentProblem?.question}</h3>
                        </div>
                        <form onSubmit={handleAnswerSubmit} className="flex gap-2">
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
                          onClick={() => handleKeyPress({ key: 'ArrowUp' } as KeyboardEvent)}
                          className="col-start-2 bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          <ArrowUp className="w-6 h-6 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleKeyPress({ key: 'ArrowLeft' } as KeyboardEvent)}
                          className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          <ArrowLeft className="w-6 h-6 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleKeyPress({ key: 'ArrowDown' } as KeyboardEvent)}
                          className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          <ArrowDown className="w-6 h-6 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleKeyPress({ key: 'ArrowRight' } as KeyboardEvent)}
                          className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          <ArrowRight className="w-6 h-6 mx-auto" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Boutons flottants et popups */}
              <button
                onClick={() => setShowCognitiveChat(true)}
                className="fixed bottom-4 right-4 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all"
              >
                <Brain className="w-6 h-6" />
              </button>

              <button
                onClick={() => setShowAIChat(true)}
                className="fixed bottom-4 left-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
              >
                <Bot className="w-6 h-6" />
              </button>

              {showCognitiveChat && (
                <CognitiveChat 
                  gameStats={gameStats} 
                  onClose={() => setShowCognitiveChat(false)} 
                />
              )}

              {showAIChat && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Bot className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold">Assistant IA</h3>
                      </div>
                      <button
                        onClick={() => setShowAIChat(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="h-96 overflow-y-auto">
                      <AIChat gameStats={gameStats} />
                    </div>
                  </div>
                </div>
              )}
              {feedbackMessage && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white font-bold ${
                  feedbackMessage === 'Correct !' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {feedbackMessage}
                </div>
              )}
            </div>
          </div>
        }
      />
      
      <Route 
        path="/dashboard"
        element={
          <Dashboard
            gameStats={location.state?.gameStats || DEFAULT_GAME_STATS}
            onReturnToGame={handleReturnToGame}
          />
        }
      />
    </Routes>
  );
}

export default App;