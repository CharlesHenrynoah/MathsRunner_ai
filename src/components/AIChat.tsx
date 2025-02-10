import React, { useState } from 'react';
import { MessageSquare, Send, Download } from 'lucide-react';
import { getGeminiResponse } from '../lib/gemini';
import { generateCSVData } from '../lib/gameAnalytics';
import { GameStats } from '../types/game';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type AIAnalysisProps = {
  gameStats: GameStats;
};

export function AIChat({ gameStats }: AIAnalysisProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Generate CSV data and include it in the context
      const csvData = generateCSVData(gameStats);
      const prompt = `
        Here is my Math Runner game performance data in CSV format:
        ${csvData}

        Based on this data, please ${userMessage}
      `;

      const response = await getGeminiResponse(prompt);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = generateCSVData(gameStats);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-runner-stats-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 w-96 bg-white rounded-lg shadow-xl">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="text-blue-600 hover:text-blue-700"
            title="Export game data as CSV"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-50 ml-8'
                : 'bg-gray-50 mr-8'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-pulse text-blue-600">Analyzing your performance...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your performance..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
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
}