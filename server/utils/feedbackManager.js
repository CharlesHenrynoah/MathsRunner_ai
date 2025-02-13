const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '../data/feedback.json');

if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify({}));
}

/**
 * Sauvegarde un feedback utilisateur.
 * @param {string} promptType - Type du prompt.
 * @param {boolean} positive - True si positif, False si négatif.
 */
function saveFeedback(promptType, positive) {
    let feedbacks = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));

    if (!feedbacks[promptType]) {
        feedbacks[promptType] = { positive: 0, negative: 0 };
    }

    positive ? feedbacks[promptType].positive++ : feedbacks[promptType].negative++;

    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2));
}

module.exports = { saveFeedback };
