import express from 'express';
import path from 'path';
import { stockage } from './storage';
import { askGemini } from './gemini_service';
import * as fs from 'fs/promises';
import { UserStats } from './types/stats';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class ChatService {
  private readonly MAX_CONVERSATIONS = 100;
  private readonly MAX_MESSAGES_PER_CONVERSATION = 5;
  private readonly conversations = new Map<string, ChatMessage[]>();
  private readonly statsDir = path.join(process.cwd(), 'stats');
  
  constructor() {
    setInterval(() => this.cleanupOldConversations(), 30 * 1000);
  }

  private cleanupOldConversations() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [userId, conversation] of Array.from(this.conversations.entries())) {
      const lastMessageTime = new Date(conversation[conversation.length - 1]?.timestamp || 0).getTime();
      if (now - lastMessageTime > 5 * 60 * 1000) {
        this.conversations.delete(userId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old conversations`);
    }
  }

  async chat(userId: string, message: string): Promise<string> {
    try {
      console.log('[Chat] New message from user:', userId);
      
      // Obtenir les informations de l'utilisateur
      const user = await stockage.getUtilisateur(Number(userId));
      if (!user) {
        console.log('[Chat] User not found:', userId);
        return "Je ne peux pas accéder à vos informations pour le moment.";
      }

      console.log('[Chat] User found:', user.nomUtilisateur);

      // Obtenir les enregistrements de partie directement depuis le stockage
      const enregistrements = await stockage.getEnregistrementsPartie(user.id);
      if (!enregistrements || enregistrements.length === 0) {
        console.log('[Chat] No game records found for user:', user.nomUtilisateur);
        return "Je vois que vous n'avez pas encore joué de parties. Jouez quelques parties pour que je puisse vous donner des statistiques !";
      }

      // Calculer les statistiques
      const stats = {
        user: {
          id: user.id.toString(),
          username: user.nomUtilisateur,
          email: user.email
        },
        personalStats: {
          totalGames: enregistrements.length,
          bestScore: Math.max(...enregistrements.map(r => r.score)),
          averageScore: Math.round(enregistrements.reduce((sum, r) => sum + r.score, 0) / enregistrements.length),
          totalCorrect: enregistrements.reduce((sum, r) => sum + r.totalCorrectes, 0),
          totalQuestions: enregistrements.reduce((sum, r) => sum + r.totalQuestions, 0),
          averageAccuracy: Number((enregistrements.reduce((sum, r) => sum + r.totalCorrectes, 0) / 
            enregistrements.reduce((sum, r) => sum + r.totalQuestions, 0) * 100).toFixed(2)),
          averageResponseTime: Number((enregistrements.reduce((sum, r) => sum + (r.tempsReponseeMoyen || 0), 0) / 
            enregistrements.filter(r => r.tempsReponseeMoyen !== undefined).length || 0).toFixed(2))
        },
        lastGame: enregistrements[enregistrements.length - 1],
        progressionTemps: {
          dernierTemps: enregistrements[enregistrements.length - 1]?.tempsReponseeMoyen || 0,
          meilleurTemps: Math.min(...enregistrements.filter(r => r.tempsReponseeMoyen !== undefined).map(r => r.tempsReponseeMoyen)),
          moyenneInitiale: enregistrements.slice(0, 3).reduce((sum, r) => sum + (r.tempsReponseeMoyen || 0), 0) / 
            enregistrements.slice(0, 3).filter(r => r.tempsReponseeMoyen !== undefined).length || 0,
          moyenneRecente: enregistrements.slice(-3).reduce((sum, r) => sum + (r.tempsReponseeMoyen || 0), 0) / 
            enregistrements.slice(-3).filter(r => r.tempsReponseeMoyen !== undefined).length || 0
        }
      };
      
      console.log('[Chat] Calculated stats:', JSON.stringify(stats, null, 2));
      
      // Envoyer le message avec le contexte des statistiques
      const response = await askGemini(message, stats);
      
      // Sauvegarder la conversation
      if (!this.conversations.has(userId)) {
        this.conversations.set(userId, []);
      }
      
      const conversation = this.conversations.get(userId)!;
      conversation.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      
      conversation.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });
      
      // Limiter le nombre de messages dans la conversation
      if (conversation.length > this.MAX_MESSAGES_PER_CONVERSATION * 2) {
        conversation.splice(0, 2);
      }
      
      return response;
    } catch (error) {
      console.error('[Chat] Error:', error);
      return "Désolé, je rencontre des difficultés pour accéder à vos statistiques. Veuillez réessayer plus tard.";
    }
  }
}

export const chatService = new ChatService();
