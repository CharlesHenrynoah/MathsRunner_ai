const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.join(__dirname, '../data');
const STATS_CSV = path.join(DATA_DIR, 'stats.csv');

/**
 * Lit un fichier CSV et le transforme en tableau d'objets JSON.
 * @param {string} filePath - Le chemin du fichier CSV.
 * @returns {Array<Object>} - Les enregistrements du fichier sous forme d'objets JSON.
 */
function readCSV(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Fichier introuvable : ${filePath}`);
            return [];
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Vérification si le fichier utilise ',' ou ';' comme séparateur
        const delimiter = content.includes(';') ? ';' : ','; 

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            delimiter: delimiter, // Détecte le bon séparateur
            relax_column_count: true, // Ignore les erreurs si certaines lignes ont moins de colonnes
            trim: true
        });

        return records;
    } catch (error) {
        console.error(`❌ Erreur lors de la lecture du CSV (${filePath}):`, error);
        return [];
    }
}

/**
 * Récupère les statistiques d'un utilisateur à partir du CSV.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @returns {Object} - Statistiques agrégées de l'utilisateur.
 */
function getUserStatsFromCSV(userId) {
    const records = readCSV(STATS_CSV);

    console.log(`📊 IDs détectés dans CSV :`, records.map(r => r["ID Utilisateur"]));

    const userRecords = records.filter(record => record["ID Utilisateur"] === userId);

    if (userRecords.length === 0) {
        console.warn(`⚠️ Aucune donnée trouvée pour l'utilisateur ${userId}.`);
        return null;
    }

    let totalScore = 0, totalGames = userRecords.length;
    let totalResponses = 0, totalResponseTime = 0;
    let bestScore = 0;

    userRecords.forEach(record => {
        const score = parseFloat(record["Score"]) || 0;
        totalScore += score;
        bestScore = Math.max(bestScore, score);

        const attempts = parseInt(record["Tentatives Totales"], 10) || 0;
        totalResponses += attempts;

        const responseTime = parseFloat(record["Temps de Réponse Moyen (s)"]) || 0;
        totalResponseTime += responseTime;
    });

    return {
        bestScore,
        averageScore: totalScore / totalGames,
        totalGames,
        averageResponseTime: totalResponses > 0 ? totalResponseTime / totalResponses : 0,
        totalResponses
    };
}


/**
 * Récupère les statistiques globales de tous les utilisateurs.
 * @returns {Object} - Statistiques globales.
 */
function getAllStatsFromCSV() {
    const records = readCSV(STATS_CSV);
    console.log("📄 Données brutes extraites :", records.slice(0, 5)); // 🔍 Voir les 5 premières lignes

    const userStats = {};

    records.forEach(record => {
        const userId = record["ID Utilisateur"];
        if (!userId) return; // Ignore les lignes sans utilisateur

        if (!userStats[userId]) {
            userStats[userId] = {
                bestScore: 0,
                totalScore: 0,
                totalGames: 0,
                totalResponses: 0,
                totalResponseTime: 0
            };
        }

        console.log(`🔎 Lecture : Score=${record["Score"]}, Tentatives=${record["Tentatives Totales"]}`);

        const score = parseFloat(record["Score"]) || 0;
        userStats[userId].totalScore += score;
        userStats[userId].bestScore = Math.max(userStats[userId].bestScore, score);

        const attempts = parseInt(record["Tentatives Totales"], 10) || 0;
        userStats[userId].totalResponses += attempts;

        const responseTime = parseFloat(record["Temps de Réponse Moyen (s)"]) || 0;
        userStats[userId].totalResponseTime += responseTime;
        userStats[userId].totalGames++;
        records.forEach(record => {
         console.log("🔍 Clés disponibles dans le record :", Object.keys(record));
        });
        
    });

    console.log("📊 Statistiques finales :", userStats);
    return userStats;
}

module.exports = {
    readCSV,
    getUserStatsFromCSV,
    getAllStatsFromCSV
};
