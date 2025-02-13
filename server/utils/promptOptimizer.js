const fs = require('fs');
const path = require('path');

const PROMPTS_FILE = path.join(__dirname, '../../.bolt/prompts.json');
const { analyzePromptImpactFromCSV } = require('./statsStorage');

function optimizePromptWithCSV(userId, promptType) {
    if (!userId) {
        console.error("Erreur : L'ID utilisateur n'a pas été fourni ou est invalide.");
        return;
    }
    let impact;
    try {
        impact = analyzePromptImpactFromCSV(userId, promptType);
    } catch (error) {
        console.error("Erreur lors de l'analyse de l'impact du prompt avec les données CSV:", error);
        return;
    }
    
    if (!impact) {
        console.log(`⚠️ L'impact du prompt "${promptType}" est vide ou non défini.`);
        return;
    }

    if (impact.includes("Évolution : 0%")) {
        console.log(`⚠️ Le prompt "${promptType}" ne montre pas d'amélioration. Génération d'un nouveau prompt...`);

        const newPrompt = `Le joueur a un taux de réussite de {success_rate}%. Voici des conseils pour s'améliorer.`;

        try {
            const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));

            if (!prompts.performance) {
                prompts.performance = {};
            }
            if (!prompts.performance[promptType]) {
                prompts.performance[promptType] = {}; 
            }

            prompts.performance[promptType].prompt = newPrompt;

            fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
            console.log(`✅ Nouveau prompt sauvegardé.`);
        } catch (error) {
            console.error('Erreur lors de la lecture/écriture du fichier de prompts:', error);
        }
    } else {
        console.log(`Le prompt "${promptType}" a montré une amélioration :`, impact);
    }
}

module.exports = { optimizePromptWithCSV };
