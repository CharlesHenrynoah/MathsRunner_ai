import React, { useState, useEffect } from 'react';
import { Brain, Zap, Target, Clock, Lightbulb, BarChart as ChartBar, Sigma } from 'lucide-react';
import { GameStats } from '../types/game';

type CognitiveMetric = {
  score: number;
  analysis: string;
  recommendations: string[];
};

type CognitiveProfile = {
  workingMemory: CognitiveMetric;
  processingSpeed: CognitiveMetric;
  patternRecognition: CognitiveMetric;
  cognitiveFlexibility: CognitiveMetric;
  problemSolving: CognitiveMetric;
  attentionControl: CognitiveMetric;
};

export function CognitiveChat({ gameStats }: { gameStats: GameStats }) {
  const [cognitiveProfile, setCognitiveProfile] = useState<CognitiveProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (gameStats && isOpen) {
      analyzeCognitiveProfile();
    }
  }, [gameStats, isOpen]);

  const calculateMetricScore = (value: number, maxValue: number): number => {
    return Math.min(100, (value / maxValue) * 100);
  };

  const analyzeCognitiveProfile = () => {
    // Working Memory Analysis
    const workingMemoryScore = calculateMetricScore(
      gameStats.correctAnswers,
      gameStats.totalAttempts
    );

    // Processing Speed Analysis
    const speedScore = calculateMetricScore(
      5000, // Ideal response time (5 seconds)
      gameStats.averageResponseTime
    );

    // Pattern Recognition Analysis
    const patternScore = calculateMetricScore(
      gameStats.level,
      20 // Maximum expected level
    );

    // Calculate overall accuracy for each operation type
    const accuracies = Object.entries(gameStats.problemTypes).map(([_, stats]) => 
      stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    );

    // Cognitive Flexibility Score based on operation variety
    const flexibilityScore = calculateMetricScore(
      accuracies.filter(acc => acc > 0).length,
      Object.keys(gameStats.problemTypes).length
    );

    // Problem Solving Score
    const problemSolvingScore = calculateMetricScore(
      gameStats.score,
      gameStats.level * 100 // Expected score based on level
    );

    // Attention Control Score
    const attentionScore = calculateMetricScore(
      gameStats.correctAnswers,
      gameStats.totalAttempts
    );

    setCognitiveProfile({
      workingMemory: {
        score: workingMemoryScore,
        analysis: `Your working memory capacity is ${
          workingMemoryScore > 80 ? 'exceptional' :
          workingMemoryScore > 60 ? 'strong' :
          workingMemoryScore > 40 ? 'developing' : 'needs focus'
        }. You can hold and manipulate ${Math.floor(workingMemoryScore / 20) + 2} items in working memory.`,
        recommendations: [
          'Practice mental math without writing',
          'Try memory games and sequence recall exercises',
          'Increase the complexity of calculations gradually'
        ]
      },
      processingSpeed: {
        score: speedScore,
        analysis: `Your cognitive processing speed is ${
          speedScore > 80 ? 'lightning fast' :
          speedScore > 60 ? 'quick' :
          speedScore > 40 ? 'moderate' : 'deliberate'
        }. Average response time: ${(gameStats.averageResponseTime / 1000).toFixed(1)}s.`,
        recommendations: [
          'Practice quick mental calculations',
          'Use timed exercises to improve speed',
          'Focus on accuracy first, then gradually increase speed'
        ]
      },
      patternRecognition: {
        score: patternScore,
        analysis: `Your pattern recognition ability is ${
          patternScore > 80 ? 'highly developed' :
          patternScore > 60 ? 'good' :
          patternScore > 40 ? 'emerging' : 'basic'
        }. You can identify and apply mathematical patterns at level ${gameStats.level}.`,
        recommendations: [
          'Look for patterns in number sequences',
          'Practice identifying relationships between operations',
          'Study mathematical series and progressions'
        ]
      },
      cognitiveFlexibility: {
        score: flexibilityScore,
        analysis: `Your cognitive flexibility is ${
          flexibilityScore > 80 ? 'exceptional' :
          flexibilityScore > 60 ? 'adaptable' :
          flexibilityScore > 40 ? 'developing' : 'focused'
        }. You can switch between ${Math.floor(flexibilityScore / 20) + 1} different operation types effectively.`,
        recommendations: [
          'Practice switching between different operations',
          'Try mixed operation exercises',
          'Challenge yourself with new problem types'
        ]
      },
      problemSolving: {
        score: problemSolvingScore,
        analysis: `Your problem-solving capability is ${
          problemSolvingScore > 80 ? 'masterful' :
          problemSolvingScore > 60 ? 'proficient' :
          problemSolvingScore > 40 ? 'developing' : 'emerging'
        }. You effectively solve problems at difficulty level ${gameStats.level}.`,
        recommendations: [
          'Break down complex problems into smaller steps',
          'Practice different problem-solving strategies',
          'Challenge yourself with progressively harder problems'
        ]
      },
      attentionControl: {
        score: attentionScore,
        analysis: `Your attention control is ${
          attentionScore > 80 ? 'highly focused' :
          attentionScore > 60 ? 'steady' :
          attentionScore > 40 ? 'variable' : 'developing'
        }. You maintain focus through ${Math.floor(attentionScore / 20) + 1} consecutive problems.`,
        recommendations: [
          'Practice mindful problem-solving',
          'Take short breaks to maintain focus',
          'Eliminate distractions during practice'
        ]
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all"
      >
        <Brain className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="font-semibold">Cognitive Profile Analysis</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-6">
        {cognitiveProfile && Object.entries(cognitiveProfile).map(([domain, data]) => (
          <div key={domain} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {domain === 'workingMemory' && <Brain className="w-5 h-5 text-purple-600" />}
                {domain === 'processingSpeed' && <Zap className="w-5 h-5 text-yellow-600" />}
                {domain === 'patternRecognition' && <Sigma className="w-5 h-5 text-blue-600" />}
                {domain === 'cognitiveFlexibility' && <ChartBar className="w-5 h-5 text-green-600" />}
                {domain === 'problemSolving' && <Lightbulb className="w-5 h-5 text-orange-600" />}
                {domain === 'attentionControl' && <Target className="w-5 h-5 text-red-600" />}
                <h4 className="font-semibold capitalize">
                  {domain.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
              </div>
              <span className="text-sm font-medium">
                {Math.round(data.score)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${data.score}%`,
                  backgroundColor: data.score > 80 ? '#10B981' :
                                data.score > 60 ? '#3B82F6' :
                                data.score > 40 ? '#F59E0B' : '#EF4444'
                }}
              />
            </div>
            <p className="text-sm text-gray-600">{data.analysis}</p>
            <div className="pl-4">
              <p className="text-sm font-medium text-purple-600 mb-1">Recommendations:</p>
              <ul className="text-sm text-gray-600 list-disc pl-4 space-y-1">
                {data.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}