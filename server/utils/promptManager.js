const fs = require('fs');
const path = require('path');

const PROMPTS_FILE = path.join(__dirname, '../../.bolt/prompts.json');

/**
 * Récupère un prompt et remplace les variables dynamiques.
 * @param {string} category - Ex: "performance".
 * @param {string} type - Ex: "global_success_rate".
 * @param {Object} data - Données dynamiques (ex: { success_rate: 85 }).
 * @returns {string}
 */
function getOptimizedPrompt(category, type, data = {}) {
    if (!fs.existsSync(PROMPTS_FILE)) {
        return "Erreur : Le fichier de prompts n'existe pas.";
    }

    const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
    let prompt = prompts[category]?.[type]?.prompt;

    if (!prompt) {
        return "Prompt non défini.";
    }

    Object.keys(data).forEach(key => {
        prompt = prompt.replace(`{${key}}`, data[key]);
    });

    return prompt;
}

module.exports = { getOptimizedPrompt };
