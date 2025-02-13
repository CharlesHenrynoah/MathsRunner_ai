const { getOptimizedPrompt } = require('./promptManager');
const { analyzePromptImpact } = require('./statsStorage');
const fs = require('fs');
const path = require('path');

const PROMPTS_FILE = path.join(__dirname, '../.bolt/prompts.json');

/**
 * Génère un prompt optimisé si l'ancien est inefficace.
 * @param {string} userId - L'utilisateur concerné.
 * @param {string} promptType - Le type de prompt à optimiser.
 */
function optimizePrompt(userId, promptType) {
    const impact = analyzePromptImpact(userId, promptType);
    
    if (impact.includes("Évolution : 0%")) {
        console.log(`⚠️ Le prompt "${promptType}" est inefficace. Génération d'un nouveau prompt...`);

        const newPrompt = `Amélioration auto : Le joueur a un taux de réussite de {success_rate}%. Stratégie pour progresser.`;

        const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
        prompts.performance[promptType].prompt = newPrompt;

        fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
        console.log(`✅ Nouveau prompt sauvegardé.`);
    }
}
const { analyzePromptImpactFromCSV } = require('./statsStorage');

/**
 * 🚀 Optimise un prompt basé sur les statistiques CSV.
 * @param {string} userId - ID utilisateur.
 * @param {string} promptType - Type de prompt à optimiser.
 */
function optimizePromptWithCSV(userId, promptType) {
    const impact = analyzePromptImpactFromCSV(userId, promptType);
    
    if (impact.includes("Évolution : 0%")) {
        console.log(`⚠️ Le prompt "${promptType}" ne montre pas d'amélioration. Génération d'un nouveau prompt...`);

        const newPrompt = `Le joueur a un taux de réussite de {success_rate}%. Voici des conseils pour s'améliorer.`;

        const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
        prompts.performance[promptType].prompt = newPrompt;

        fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
        console.log(`✅ Nouveau prompt sauvegardé.`);
    }
}

module.exports = { optimizePromptWithCSV };

