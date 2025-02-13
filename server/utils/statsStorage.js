const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const STATS_DIR = path.join(__dirname, 'userStats');
const PROMPTS_FILE = path.join(__dirname, '../.bolt/prompts.json');

// Assure que le dossier des statistiques existe
if (!fs.existsSync(STATS_DIR)) {
    fs.mkdirSync(STATS_DIR, { recursive: true });
}

function getUserStatsFile(userId) {
    return path.join(STATS_DIR, `${userId}_stats.json`);
}

function saveGameStats(stats, userId) {
    try {
        const statsFile = getUserStatsFile(userId);
        
        let userStats = [];
        if (fs.existsSync(statsFile)) {
            const content = fs.readFileSync(statsFile, 'utf8');
            userStats = JSON.parse(content);
        }
        console.log(`📝 Enregistrement d'une partie pour ${userId}:`, stats);

        const statsWithTimestamp = {
            ...stats,
            userId,
            timestamp: new Date().toISOString()
        };
        userStats.push(statsWithTimestamp);

        fs.writeFileSync(statsFile, JSON.stringify(userStats, null, 2));
        broadcastStatsUpdate(userId, statsWithTimestamp);

        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des stats:', error);
        return false;
    }
}

function calculateGlobalStats(userGames) {
    if (!userGames || userGames.length === 0) {
        return {
            bestScore: 0,
            averageScore: 0,
            totalGames: 0,
            averageResponseTime: 0,
            totalResponses: 0,
            lastGameStats: null
        };
    }

    const stats = {
        bestScore: 0,
        totalScore: 0,
        totalGames: userGames.length,
        totalResponseTime: 0,
        totalResponses: 0
    };

    userGames.forEach(game => {
        stats.bestScore = Math.max(stats.bestScore, game.score || 0);
        stats.totalScore += game.score || 0;
        stats.totalResponseTime += game.totalResponseTime || 0;
        stats.totalResponses += game.totalAttempts || 0;
    });

    return {
        bestScore: stats.bestScore,
        averageScore: stats.totalScore / stats.totalGames,
        totalGames: stats.totalGames,
        averageResponseTime: stats.totalResponses > 0 ? stats.totalResponseTime / stats.totalResponses : 0,
        totalResponses: stats.totalResponses,
        lastGameStats: userGames[userGames.length - 1]
    };
}

function getUserStats(userId) {
    try {
        const statsFile = getUserStatsFile(userId);
        if (fs.existsSync(statsFile)) {
            const content = fs.readFileSync(statsFile, 'utf8');
            const userGames = JSON.parse(content);
            return calculateGlobalStats(userGames);
        }
        return calculateGlobalStats([]);
    } catch (error) {
        console.error('Erreur lors de la lecture des stats:', error);
        return calculateGlobalStats([]);
    }
}

function getAllStats() {
    try {
        const files = fs.readdirSync(STATS_DIR);
        const allStats = {};
        
        files.forEach(file => {
            if (file.endsWith('_stats.json')) {
                const userId = file.replace('_stats.json', '');
                const content = fs.readFileSync(path.join(STATS_DIR, file), 'utf8');
                const userGames = JSON.parse(content);
                allStats[userId] = calculateGlobalStats(userGames);
            }
        });
        
        return allStats;
    } catch (error) {
        console.error('Erreur lors de la lecture des stats:', error);
        return {};
    }
}

function broadcastStatsUpdate(userId, stats) {
    const data = {
        userId,
        stats
    };
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

/**
 * 📊 Analyse l’impact d’un prompt sur la performance d’un joueur.
 */
function analyzePromptImpact(userId, promptType) {
    try {
        const statsFile = getUserStatsFile(userId);
        if (!fs.existsSync(statsFile)) {
            return `❌ Aucune donnée pour l'utilisateur ${userId}.`;
        }

        const content = fs.readFileSync(statsFile, 'utf8');
        const userGames = JSON.parse(content);

        if (userGames.length < 2) {
            return `⚠️ Pas assez de données pour analyser l'impact du prompt ${promptType}.`;
        }

        userGames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const firstGame = userGames[0];
        const lastGame = userGames[userGames.length - 1];

        const successRateBefore = firstGame.success_rate || 0;
        const successRateAfter = lastGame.success_rate || 0;

        return `📊 Impact du prompt "${promptType}" :
        - Taux de réussite avant : ${successRateBefore}%
        - Taux de réussite après : ${successRateAfter}%
        - Évolution : ${successRateAfter - successRateBefore}%`;
        
    } catch (error) {
        console.error(`Erreur lors de l'analyse de l'impact du prompt ${promptType}:`, error);
        return "❌ Erreur lors de l'analyse.";
    }
}

/**
 * 🚀 Optimise automatiquement les prompts en fonction de leur impact.
 */
function updatePromptIfNeeded(userId, promptType) {
    const impact = analyzePromptImpact(userId, promptType);
    console.log(impact);

    if (impact.includes("Évolution : 0%")) {
        console.log(`⚠️ Le prompt "${promptType}" n'a pas amélioré les performances. Génération d'un nouveau prompt...`);

        // Générer un nouveau prompt simple (à améliorer avec un LLM)
        const newPrompt = `Amélioration automatique : Le joueur a un taux de réussite de {success_rate}%. Voici une stratégie pour progresser.`;

        if (!fs.existsSync(PROMPTS_FILE)) {
            console.log("❌ Le fichier de prompts n'existe pas.");
            return;
        }

        const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));

        if (prompts.performance[promptType]) {
            prompts.performance[promptType].prompt = newPrompt;
            fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
            console.log(`✅ Nouveau prompt sauvegardé pour "${promptType}".`);
        }
    }
}

module.exports = {
    saveGameStats,
    getUserStats,
    getAllStats,
    analyzePromptImpact,
    updatePromptIfNeeded
};

const { getUserStatsFromCSV } = require('./dataManager');

/**
 * 📊 Analyse l’impact d’un prompt en utilisant les stats CSV.
 * @param {string} userId - Identifiant de l'utilisateur.
 * @param {string} promptType - Type de prompt évalué.
 */
function analyzePromptImpactFromCSV(userId, promptType) {
    const stats = getUserStatsFromCSV().filter(stat => stat.ID === userId);

    if (stats.length < 2) {
        return `⚠️ Pas assez de données pour analyser l'impact du prompt ${promptType}.`;
    }

    const firstGame = stats[0];
    const lastGame = stats[stats.length - 1];

    const successRateBefore = parseFloat(firstGame.Précision) || 0;
    const successRateAfter = parseFloat(lastGame.Précision) || 0;

    return `📊 Impact du prompt "${promptType}" :
    - Taux de réussite avant : ${successRateBefore}%
    - Taux de réussite après : ${successRateAfter}%
    - Évolution : ${(successRateAfter - successRateBefore).toFixed(2)}%`;
}

module.exports = { analyzePromptImpactFromCSV };

