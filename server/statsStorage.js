const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const STATS_DIR = path.join(__dirname, 'userStats');

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
        
        // Lire les statistiques existantes de l'utilisateur
        let userStats = [];
        if (fs.existsSync(statsFile)) {
            const content = fs.readFileSync(statsFile, 'utf8');
            userStats = JSON.parse(content);
        }

        // Ajouter les nouvelles statistiques
        const statsWithTimestamp = {
            ...stats,
            userId,
            timestamp: new Date().toISOString()
        };
        userStats.push(statsWithTimestamp);

        // Sauvegarder dans le fichier de l'utilisateur
        fs.writeFileSync(statsFile, JSON.stringify(userStats, null, 2));

        // Broadcast the updated stats to WebSocket clients
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
            lastGameStats: null,
            problemTypes: {
                addition: { correct: 0, total: 0, averageTime: 0 },
                subtraction: { correct: 0, total: 0, averageTime: 0 },
                multiplication: { correct: 0, total: 0, averageTime: 0 },
                division: { correct: 0, total: 0, averageTime: 0 },
                puissance: { correct: 0, total: 0, averageTime: 0 },
                algebre: { correct: 0, total: 0, averageTime: 0 }
            }
        };
    }

    const stats = {
        bestScore: 0,
        totalScore: 0,
        totalGames: userGames.length,
        totalResponseTime: 0,
        totalResponses: 0,
        problemTypes: {
            addition: { correct: 0, total: 0, totalTime: 0 },
            subtraction: { correct: 0, total: 0, totalTime: 0 },
            multiplication: { correct: 0, total: 0, totalTime: 0 },
            division: { correct: 0, total: 0, totalTime: 0 },
            puissance: { correct: 0, total: 0, totalTime: 0 },
            algebre: { correct: 0, total: 0, totalTime: 0 }
        }
    };

    // Calculer les statistiques globales
    userGames.forEach(game => {
        // Mettre à jour le meilleur score
        stats.bestScore = Math.max(stats.bestScore, game.score || 0);
        stats.totalScore += game.score || 0;
        stats.totalResponseTime += game.totalResponseTime || 0;
        stats.totalResponses += game.totalAttempts || 0;

        // Calculer les stats par type de problème
        Object.entries(game.problemTypes || {}).forEach(([type, data]) => {
            if (stats.problemTypes[type]) {
                stats.problemTypes[type].correct += data.correct || 0;
                stats.problemTypes[type].total += data.total || 0;
                stats.problemTypes[type].totalTime += data.totalTime || 0;
            }
        });
    });

    // Calculer les moyennes
    const calculatedStats = {
        bestScore: stats.bestScore,
        averageScore: stats.totalScore / stats.totalGames,
        totalGames: stats.totalGames,
        averageResponseTime: stats.totalResponses > 0 ? stats.totalResponseTime / stats.totalResponses : 0,
        totalResponses: stats.totalResponses,
        lastGameStats: userGames[userGames.length - 1],
        problemTypes: {}
    };

    // Calculer les moyennes pour chaque type de problème
    Object.entries(stats.problemTypes).forEach(([type, data]) => {
        calculatedStats.problemTypes[type] = {
            correct: data.correct,
            total: data.total,
            averageTime: data.total > 0 ? data.totalTime / data.total : 0
        };
    });

    return calculatedStats;
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

module.exports = {
    saveGameStats,
    getUserStats,
    getAllStats
};
