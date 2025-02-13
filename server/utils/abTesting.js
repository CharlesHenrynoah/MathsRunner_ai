const { queryMistral } = require('./llmService');

/**
 * Compare un ancien et un nouveau prompt via A/B Testing en demandant à Mistral d’évaluer la qualité des réponses.
 * @param {string} oldPrompt - L'ancien prompt.
 * @param {string} newPrompt - Le prompt optimisé.
 * @returns {Promise<boolean>} - Retourne vrai si le nouveau prompt est meilleur.
 */
async function testPrompt(oldPrompt, newPrompt) {
    const testInput = "Analyse ma progression sur les 10 derniers niveaux.";

    // Générer les réponses des deux prompts
    const responseA = await queryMistral(oldPrompt.replace("{input}", testInput));
    const responseB = await queryMistral(newPrompt.replace("{input}", testInput));

    // Demander à Mistral d'évaluer la pertinence de chaque réponse
    const evalPrompt = "Évalue cette réponse sur 100 en fonction de sa cohérence, sa précision et son utilité :";

    const scoreA = await queryMistral(`${evalPrompt}\nRéponse : ${responseA}`);
    const scoreB = await queryMistral(`${evalPrompt}\nRéponse : ${responseB}`);

    console.log(`🔎 A/B Testing : Ancien prompt ${scoreA}/100, Nouveau prompt ${scoreB}/100`);

    return scoreB > scoreA;
}

module.exports = { testPrompt };

