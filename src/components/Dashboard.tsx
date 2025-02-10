import React from 'react';
import { BarChart, LineChart, PieChart, Activity, Brain, Clock, Target, ArrowLeft } from 'lucide-react';
import { GameStats } from '../types/game';

type DashboardProps = {
  gameStats: GameStats;
  onReturn: () => void;
};

export function Dashboard({ gameStats, onReturn }: DashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<'day' | 'week' | 'month'>('day');

  // Calculate KPIs
  const accuracy = gameStats.totalAttempts > 0 
    ? (gameStats.correctAnswers / gameStats.totalAttempts) * 100 
    : 0;
  
  const averageTimePerProblem = gameStats.averageResponseTime / 1000; // Convert to seconds
  
  const operationBreakdown = Object.entries(gameStats.problemTypes).map(([type, stats]) => ({
    type,
    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
            <button
              onClick={onReturn}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Game
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTimeframe('day')}
              className={`px-4 py-2 rounded-lg ${
                selectedTimeframe === 'day' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedTimeframe('week')}
              className={`px-4 py-2 rounded-lg ${
                selectedTimeframe === 'week' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setSelectedTimeframe('month')}
              className={`px-4 py-2 rounded-lg ${
                selectedTimeframe === 'month' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Level Reached</h3>
                <p className="text-2xl font-bold text-gray-900">{gameStats.level}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-green-600">
              <Activity className="w-4 h-4 mr-1" />
              <span>+2 levels today</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Accuracy</h3>
                <p className="text-2xl font-bold text-gray-900">{accuracy.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${accuracy}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
                <p className="text-2xl font-bold text-gray-900">{averageTimePerProblem.toFixed(1)}s</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-green-600">
              <Activity className="w-4 h-4 mr-1" />
              <span>-0.5s from last session</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Score</h3>
                <p className="text-2xl font-bold text-gray-900">{gameStats.score}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-green-600">
              <Activity className="w-4 h-4 mr-1" />
              <span>+120 points today</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Accuracy</h3>
            <div className="h-64">
              {operationBreakdown.map((op, index) => (
                <div key={op.type} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{op.type}</span>
                    <span>{op.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${op.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Problem Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>More data needed for visualization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}