import axios, { AxiosError } from 'axios';
import * as fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Détecter le type de question
function detectQuestionType(question: string): string {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('score') || 
      questionLower.includes('points') || 
      questionLower.includes('résultat') ||
      questionLower.includes('performance')) {
    return 'performance';
  }
  
  if (questionLower.includes('règle') || 
      questionLower.includes('comment') || 
      questionLower.includes('explique')) {
    return 'rules';
  }
  
  if (questionLower.includes('exercice') || 
      questionLower.includes('problème') || 
      questionLower.includes('calcul')) {
    return 'math';
  }
  
  return 'general';
}

// Charger les chunks depuis les fichiers
async function loadChunks(): Promise<Record<string, string>> {
  const chunksDir = path.join(process.cwd(), 'Model', 'chunks');
  const chunks: Record<string, string> = {};

  try {
    const files = await fs.readdir(chunksDir);
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const content = await fs.readFile(path.join(chunksDir, file), 'utf-8');
        chunks[file] = content;
      }
    }
  } catch (error) {
    console.error('[Gemini] Error loading chunks:', error);
  }

  return chunks;
}

// Construire le prompt en fonction du type de question
async function buildPrompt(question: string, questionType: string, userStats: any): Promise<string> {
  const chunks = await loadChunks();
  let contextChunks = '';
  
  // Sélectionner les chunks pertinents
  Object.entries(chunks).forEach(([filename, content]) => {
    if (filename.startsWith(questionType)) {
      contextChunks += content + '\n';
    }
  });

  // Construire le contexte des statistiques
  let statsContext = '';
  if (userStats) {
    const ps = userStats.personalStats;
    const pt = userStats.progressionTemps;
    statsContext = `
Statistiques de l'élève ${userStats.user.username} :
- Nombre total de parties : ${ps.totalGames}
- Score moyen : ${ps.averageScore}
- Meilleur score : ${ps.bestScore}
- Questions totales : ${ps.totalQuestions}
- Questions correctes : ${ps.totalCorrect}
- Précision moyenne : ${ps.averageAccuracy}%
- Temps de réponse moyen : ${ps.averageResponseTime} secondes

Progression du temps de réponse :
- Temps moyen initial (3 premières parties) : ${pt.moyenneInitiale.toFixed(2)} secondes
- Temps moyen récent (3 dernières parties) : ${pt.moyenneRecente.toFixed(2)} secondes
- Meilleur temps : ${pt.meilleurTemps.toFixed(2)} secondes

Dernière partie :
- Score : ${userStats.lastGame.score}
- Questions correctes : ${userStats.lastGame.totalCorrectes}/${userStats.lastGame.totalQuestions}
- Temps de réponse moyen : ${userStats.lastGame.tempsReponseeMoyen?.toFixed(2) || 'Non disponible'} secondes
`;
  }

  return `
Instructions pour l'assistant mathématique :
1. Vous êtes un assistant mathématique expert et pédagogue
2. Adaptez votre réponse au niveau de l'élève
3. Donnez des explications claires et concises
4. Utilisez des emojis pour rendre vos réponses plus engageantes
5. Structurez vos réponses avec des paragraphes clairs
6. IMPORTANT : Répondez TOUJOURS en français

Voici comment structurer vos réponses :
- Commencez par une salutation personnalisée avec un emoji 👋
- Divisez votre réponse en sections claires avec des emojis appropriés :
  * 📊 Statistiques globales
  * 💪 Points forts
  * 📈 Progression
  * 🎯 Points à améliorer
  * 💡 Conseils
- Terminez par un message d'encouragement avec un emoji positif 🌟

${statsContext}

Question de l'élève : ${question}

Réponse en tant qu'assistant mathématique en français :`;
}

export async function askGemini(question: string, userStats?: any): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] API key not found');
    return 'Configuration de l\'assistant incomplète. Veuillez contacter l\'administrateur.';
  }

  try {
    const prompt = await buildPrompt(question, detectQuestionType(question), userStats);

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('[Gemini] Unexpected response format:', JSON.stringify(response.data, null, 2));
      return 'Désolé, je n\'ai pas pu générer une réponse appropriée. Veuillez réessayer.';
    }

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('[Gemini] Error:', axiosError.response?.data || axiosError.message);
    
    if (axiosError.code === 'ECONNABORTED') {
      return '⚠️ La réponse prend trop de temps. Veuillez réessayer avec une question plus simple.';
    }
    
    if (axiosError.response?.status === 400) {
      return '❓ Votre question est trop complexe. Veuillez la reformuler plus simplement.';
    }
    
    return '🔧 Erreur de communication avec l\'assistant. Veuillez réessayer dans quelques instants.';
  }
}
