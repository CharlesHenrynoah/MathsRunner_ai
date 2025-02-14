import axios from 'axios';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { userStatsService } from './user_stats_service';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionCategory {
  keywords: string[];
  weight: number;
}

const CATEGORIES: { [key: string]: QuestionCategory } = {
  generalStats: {
    keywords: ['score', 'performance', 'global', 'moyenne', 'total', 'précision'],
    weight: 1.5
  },
  lastGame: {
    keywords: ['dernière partie', 'dernier score', 'dernière session', 'dernière fois'],
    weight: 2.0
  },
  typePerformance: {
    keywords: ['addition', 'soustraction', 'multiplication', 'division', 'puissance', 'algèbre'],
    weight: 1.8
  },
  trends: {
    keywords: ['tendance', 'progression', 'amélioration', 'évolution', 'comparaison'],
    weight: 1.3
  },
  cognitive: {
    keywords: ['mémoire', 'concentration', 'rapidité', 'temps de réponse', 'fatigue', 'stress'],
    weight: 1.6
  }
};

interface Message {
  role: string;
  content: string;
}

export class LocalModelService {
  private modelProcess: any = null;
  private chunksCache: Map<string, string> = new Map();
  private initialized = false;

  private async initializeChunksCache() {
    try {
      const chunksDir = path.join(__dirname, '../Model/chunks');
      const files = await fs.readdir(chunksDir);
      
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const content = await fs.readFile(path.join(chunksDir, file), 'utf-8');
          this.chunksCache.set(file, content);
        }
      }
      console.log(`Cache initialisé avec ${this.chunksCache.size} chunks`);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du cache:', error);
    }
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private identifyQuestionCategory(query: string): string[] {
    const categories: string[] = [];
    const queryLower = query.toLowerCase();
    
    for (const [category, data] of Object.entries(CATEGORIES)) {
      for (const keyword of data.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          categories.push(category);
          break;
        }
      }
    }
    
    return categories.length > 0 ? categories : ['generalStats'];
  }

  private calculateRelevance(text: string, query: string, categories: string[]): number {
    const textLower = text.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    if (queryWords.length === 0) return 0;
    
    let score = 0;
    // Score de base pour les mots de la requête
    for (const word of queryWords) {
      if (word.length === 0) continue;
      const escapedWord = this.escapeRegExp(word);
      const regex = new RegExp(escapedWord, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    // Bonus pour les correspondances exactes
    const escapedQuery = this.escapeRegExp(query.toLowerCase());
    const exactMatches = textLower.match(new RegExp(escapedQuery, 'g'));
    if (exactMatches) {
      score += exactMatches.length * 2;
    }

    // Bonus pour les mots-clés de catégorie
    for (const category of categories) {
      const categoryData = CATEGORIES[category];
      if (categoryData) {
        for (const keyword of categoryData.keywords) {
          const escapedKeyword = this.escapeRegExp(keyword.toLowerCase());
          const keywordMatches = textLower.match(new RegExp(escapedKeyword, 'g'));
          if (keywordMatches) {
            score += keywordMatches.length * categoryData.weight;
          }
        }
      }
    }

    return score;
  }

  private async findRelevantChunks(query: string): Promise<string[]> {
    const categories = this.identifyQuestionCategory(query);
    const chunks = Array.from(this.chunksCache.values());
    const scoredChunks = chunks.map(chunk => ({
      content: chunk,
      score: this.calculateRelevance(chunk, query, categories)
    }));

    // Sélectionner les chunks les plus pertinents
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Augmenter le nombre de chunks pour avoir plus de contexte
      .map(chunk => chunk.content);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.initializeChunksCache();

      this.initialized = true;
      console.log('Service initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  async chat(message: string, userContext: string, history: Message[] = []): Promise<string> {
    const startTime = Date.now();
    console.log(`[LlamaService] Démarrage du chat - Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    try {
      if (!this.initialized) {
        console.log('[LlamaService] Initialisation du service...');
        await this.initialize();
      }

      // Extract user ID from context
      const userId = userContext.split(':')[0];
      
      // Get actual user stats
      const userStats = await userStatsService.getUserStats(userId);
      
      if (!userStats) {
        throw new Error('User stats not found');
      }

      // Get latest game session if available
      const latestSession = userStats.gameSessions[userStats.gameSessions.length - 1];
      
      // Calculate trends
      const recentSessions = userStats.gameSessions.slice(-5);
      const scoresTrend = recentSessions.map(session => session.score);
      const scoreTrend = scoresTrend.length > 1 
        ? ((scoresTrend[scoresTrend.length - 1] - scoresTrend[0]) / scoresTrend[0] * 100).toFixed(1)
        : '0';

      // Create detailed context object
      const context = {
        level: userStats.personalStats.niveau,
        currentScore: latestSession?.score || 0,
        averageScore: userStats.personalStats.scoreMoyen,
        bestScore: userStats.personalStats.meilleurScore,
        responseTime: userStats.personalStats.tempsReponseMoyen,
        recentExercises: userStats.personalStats.derniersExercices,
        recentSessions: recentSessions,
        trend: `${scoreTrend}%`,
        totalSessions: userStats.gameSessions.length
      };

      // 1. D'abord obtenir une réponse basée sur les chunks
      console.log('[LlamaService] Recherche des chunks pertinents...');
      const relevantChunks = await this.findRelevantChunks(message);
      console.log(`[LlamaService] ${relevantChunks.length} chunks trouvés`);
      const chunksContext = relevantChunks.join('\n\n');

      // Créer le prompt initial avec les chunks
      const initialPrompt = `[INST] Tu es un assistant mathématique expert. Utilise ces informations pour répondre :

DONNÉES DE RÉFÉRENCE :
${chunksContext}

HISTORIQUE DE CONVERSATION :
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User Information:
Level: ${context.level}
Average Score: ${context.averageScore}
Best Score: ${context.bestScore}
Average Response Time: ${context.responseTime}s
Recent Performance: ${JSON.stringify(context.recentExercises)}
Game History: ${JSON.stringify(context.recentSessions.slice(-5))}

Question: ${message} [/INST]`;

      console.log('[LlamaService] Envoi du prompt initial au modèle...');
      // 2. Obtenir la réponse initiale basée sur les chunks
      const response = await this.processMessage(initialPrompt, context);

      const duration = Date.now() - startTime;
      console.log(`[LlamaService] Chat terminé en ${duration}ms`);
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Créer un objet d'erreur sécurisé avec vérification de type
      const errorDetails = {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        messageLength: message?.length,
        contextPresent: !!userContext,
        historyLength: history?.length
      };
      
      console.error(`[LlamaService] Erreur lors du chat (${duration}ms):`, errorDetails);
      throw error;
    }
  }

  private async processMessage(message: string, userContext: any = null): Promise<string> {
    try {
      const context = Array.from(this.chunksCache.values()).join('\n\n');

      const prompt = `
Mathematical Context:
${context}

User Information:
Level: ${userContext.level}
Average Score: ${userContext.averageScore}
Best Score: ${userContext.bestScore}
Average Response Time: ${userContext.responseTime}s
Recent Performance: ${JSON.stringify(userContext.recentExercises)}
Game History: ${JSON.stringify(userContext.recentSessions.slice(-5))}

User Question:
${message}

Please provide a response that:
1. Uses the exact numbers from the user's current statistics
2. Mentions specific trends and patterns in their performance
3. Gives personalized advice based on their level and recent performance
4. Encourages improvement while acknowledging their achievements
`;

      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data.candidates && response.data.candidates.length > 0) {
        return response.data.candidates[0].content.parts[0].text;
      }

      throw new Error('No valid response from Gemini API');

    } catch (error) {
      console.error('[ChatService] Error processing message:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Timeout: The request took too long to complete');
        }
        throw new Error(`API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async cleanup() {
    this.initialized = false;
  }
}

export const localModelService = new LocalModelService();
