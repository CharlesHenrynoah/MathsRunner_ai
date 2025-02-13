const fs = require('fs');
const path = require('path');

const CAPTURE_FILE = path.join(__dirname, '../data/capture.json');

if (!fs.existsSync(CAPTURE_FILE)) {
    fs.writeFileSync(CAPTURE_FILE, JSON.stringify([]));
}

/**
 * Enregistre une interaction entre un utilisateur et le modèle.
 * @param {string} userId - L'ID de l'utilisateur.
 * @param {string} input - La question posée.
 * @param {string} output - La réponse générée.
 */
function captureInteraction(userId, input, output) {
    const captures = JSON.parse(fs.readFileSync(CAPTURE_FILE, 'utf-8'));
    captures.push({ userId, input, output, timestamp: new Date().toISOString() });

    fs.writeFileSync(CAPTURE_FILE, JSON.stringify(captures, null, 2));
}

module.exports = { captureInteraction };
