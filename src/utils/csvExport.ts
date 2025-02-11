import { GameStats } from '../types/game';

// Fonction pour sauvegarder les stats dans le localStorage au format CSV
export function saveStatsToCSV(stats: GameStats): void {
    const timestamp = new Date().toISOString();
    const existingData = localStorage.getItem('mathrunner_stats_csv') || '';
    
    // Si c'est la première entrée, ajouter les en-têtes
    if (!existingData) {
        const headers = [
            'timestamp',
            'level',
            'score',
            'correctAnswers',
            'totalAttempts',
            'accuracy',
            'averageResponseTime',
            'additionCorrect',
            'additionTotal',
            'subtractionCorrect',
            'subtractionTotal',
            'multiplicationCorrect',
            'multiplicationTotal',
            'divisionCorrect',
            'divisionTotal',
            'powerCorrect',
            'powerTotal',
            'algebraicCorrect',
            'algebraicTotal'
        ].join(',');
        localStorage.setItem('mathrunner_stats_csv', headers + '\n');
    }

    // Préparer les données
    const accuracy = stats.totalAttempts > 0 
        ? ((stats.correctAnswers / stats.totalAttempts) * 100).toFixed(2) 
        : '0';
    const avgResponseTime = (stats.averageResponseTime / 1000).toFixed(2);

    // Créer la ligne de données
    const dataRow = [
        timestamp,
        stats.level,
        stats.score,
        stats.correctAnswers,
        stats.totalAttempts,
        accuracy,
        avgResponseTime,
        stats.problemTypes.addition.correct,
        stats.problemTypes.addition.total,
        stats.problemTypes.subtraction.correct,
        stats.problemTypes.subtraction.total,
        stats.problemTypes.multiplication.correct,
        stats.problemTypes.multiplication.total,
        stats.problemTypes.division.correct,
        stats.problemTypes.division.total,
        stats.problemTypes.power.correct,
        stats.problemTypes.power.total,
        stats.problemTypes.algebraic.correct,
        stats.problemTypes.algebraic.total
    ].join(',');

    // Ajouter la nouvelle ligne aux données existantes
    const updatedData = localStorage.getItem('mathrunner_stats_csv') + dataRow + '\n';
    localStorage.setItem('mathrunner_stats_csv', updatedData);
}

export function getStatsFromCSV(): Array<any> {
    const csvData = localStorage.getItem('mathrunner_stats_csv');
    if (!csvData) return [];

    const lines = csvData.trim().split('\n');
    if (lines.length <= 1) return []; // Retourner un tableau vide s'il n'y a que les en-têtes

    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const entry: any = {};
        
        headers.forEach((header, index) => {
            // Convertir les valeurs numériques
            if (['level', 'score', 'correctAnswers', 'totalAttempts',
                 'additionCorrect', 'additionTotal', 'subtractionCorrect', 'subtractionTotal',
                 'multiplicationCorrect', 'multiplicationTotal', 'divisionCorrect', 'divisionTotal',
                 'powerCorrect', 'powerTotal', 'algebraicCorrect', 'algebraicTotal'].includes(header)) {
                entry[header] = parseInt(values[index], 10);
            } else if (['accuracy', 'averageResponseTime'].includes(header)) {
                entry[header] = parseFloat(values[index]);
            } else {
                entry[header] = values[index];
            }
        });
        
        return entry;
    });
}

export function clearStatsCSV(): void {
    localStorage.removeItem('mathrunner_stats_csv');
}
