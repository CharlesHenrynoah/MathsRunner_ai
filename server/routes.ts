import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { stockage } from "./storage";
import { userStatsService } from "./user_stats_service";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Récupérer tous les enregistrements de jeu de l'utilisateur
    const enregistrementsBruts = await stockage.getEnregistrementsPartie(req.user.id);
    
    // Filtrer les enregistrements valides (qui ont un typeProbleme)
    const enregistrements = enregistrementsBruts.filter(e => e.typeProbleme && e.typeProbleme.length > 0);

    if (!enregistrements || enregistrements.length === 0) {
      return res.json({
        user: {
          id: req.user.id.toString(),
          username: req.user.nomUtilisateur,
          email: req.user.email,
          date: new Date().toISOString()
        },
        dataByDate: [{
          date: new Date().toISOString(),
          personalStats: {
            level: 1,
            averageScore: 0,
            bestScore: 0,
            averageResponseTime: 0
          },
          statsByType: [
            { type: "Addition", correct: 0, total: 0, accuracy: 0 },
            { type: "Subtraction", correct: 0, total: 0, accuracy: 0 },
            { type: "Multiplication", correct: 0, total: 0, accuracy: 0 },
            { type: "Division", correct: 0, total: 0, accuracy: 0 },
            { type: "Power", correct: 0, total: 0, accuracy: 0 },
            { type: "Algebra", correct: 0, total: 0, accuracy: 0 }
          ],
          lastGame: null,
          gameHistory: []
        }]
      });
    }

    // Calculer les statistiques
    const totalParties = enregistrements.length;
    const meilleurScore = Math.max(...enregistrements.map(r => r.score));
    const scoreMoyen = Math.round(enregistrements.reduce((sum, r) => sum + r.score, 0) / totalParties);
    const tempsReponseMoyen = Number((enregistrements.reduce((sum, r) => sum + r.tempsReponseeMoyen, 0) / totalParties).toFixed(2));
    
    // Calculer la précision globale
    const totalCorrectes = enregistrements.reduce((sum, r) => sum + r.totalCorrectes, 0);
    const totalQuestions = enregistrements.reduce((sum, r) => sum + r.totalQuestions, 0);
    const precisionGlobale = Number(((totalCorrectes / totalQuestions) * 100).toFixed(2)) || 0;

    // Calculer les statistiques par type
    const statsParType = [
      { type: "addition", correct: 0, total: 0, accuracy: 0 },
      { type: "subtraction", correct: 0, total: 0, accuracy: 0 },
      { type: "multiplication", correct: 0, total: 0, accuracy: 0 },
      { type: "division", correct: 0, total: 0, accuracy: 0 },
      { type: "power", correct: 0, total: 0, accuracy: 0 },
      { type: "algebra", correct: 0, total: 0, accuracy: 0 }
    ];

    enregistrements.forEach(enregistrement => {
      const additionStats = statsParType[0];
      additionStats.correct += enregistrement.additionCorrectes;
      additionStats.total += enregistrement.additionTotal;
      additionStats.accuracy = Math.round((additionStats.correct / additionStats.total) * 100) || 0;

      const subtractionStats = statsParType[1];
      subtractionStats.correct += enregistrement.soustractionCorrectes;
      subtractionStats.total += enregistrement.soustractionTotal;
      subtractionStats.accuracy = Math.round((subtractionStats.correct / subtractionStats.total) * 100) || 0;

      const multiplicationStats = statsParType[2];
      multiplicationStats.correct += enregistrement.multiplicationCorrectes;
      multiplicationStats.total += enregistrement.multiplicationTotal;
      multiplicationStats.accuracy = Math.round((multiplicationStats.correct / multiplicationStats.total) * 100) || 0;

      const divisionStats = statsParType[3];
      divisionStats.correct += enregistrement.divisionCorrectes;
      divisionStats.total += enregistrement.divisionTotal;
      divisionStats.accuracy = Math.round((divisionStats.correct / divisionStats.total) * 100) || 0;

      const powerStats = statsParType[4];
      powerStats.correct += enregistrement.puissanceCorrectes;
      powerStats.total += enregistrement.puissanceTotal;
      powerStats.accuracy = Math.round((powerStats.correct / powerStats.total) * 100) || 0;

      const algebraStats = statsParType[5];
      algebraStats.correct += enregistrement.algebraCorrectes;
      algebraStats.total += enregistrement.algebraTotal;
      algebraStats.accuracy = Math.round((algebraStats.correct / algebraStats.total) * 100) || 0;
    });

    // Obtenir la dernière partie
    const dernierePartie = enregistrements[enregistrements.length - 1];

    // Formater les données dans le format attendu par le client
    res.json({
      user: {
        id: req.user.id.toString(),
        username: req.user.nomUtilisateur,
        email: req.user.email,
        date: new Date().toISOString()
      },
      dataByDate: [{
        date: new Date().toISOString(),
        personalStats: {
          level: dernierePartie.niveau,
          averageScore: scoreMoyen,
          bestScore: meilleurScore,
          averageResponseTime: tempsReponseMoyen,
          globalAccuracy: precisionGlobale
        },
        statsByType: statsParType,
        lastGame: {
          score: dernierePartie.score,
          levelReached: dernierePartie.niveau,
          correctQuestions: dernierePartie.totalCorrectes,
          incorrectQuestions: dernierePartie.totalIncorrectes,
          averageResponseTime: dernierePartie.tempsReponseeMoyen,
          bestType: getMeilleurType(dernierePartie)
        },
        gameHistory: enregistrements
          .slice(-10)
          .reverse()
          .map(game => ({
            date: game.dateCreation.toISOString(),
            problemTypes: [game.typeProbleme],
            maxLevelReached: game.niveau,
            score: game.score
          }))
      }]
    });
  });

  app.post("/api/game/record", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const {
      score,
      niveau,
      typeProbleme,
      totalQuestions,
      totalCorrectes,
      totalIncorrectes,
      tempsReponseMoyen,
      additionCorrectes,
      additionTotal,
      soustractionCorrectes,
      soustractionTotal,
      multiplicationCorrectes,
      multiplicationTotal,
      divisionCorrectes,
      divisionTotal,
      puissanceCorrectes,
      puissanceTotal,
      algebraCorrectes,
      algebraTotal,
      exercices  // Ajout des exercices depuis le body
    } = req.body;

    try {
      const enregistrementPartie = await stockage.ajouterEnregistrementPartie({
        idUtilisateur: req.user.id,
        score,
        niveau,
        typeProbleme,
        totalQuestions,
        totalCorrectes,
        totalIncorrectes,
        tempsReponseeMoyen: tempsReponseMoyen,
        additionCorrectes,
        additionTotal,
        soustractionCorrectes,
        soustractionTotal,
        multiplicationCorrectes,
        multiplicationTotal,
        divisionCorrectes,
        divisionTotal,
        puissanceCorrectes,
        puissanceTotal,
        algebraCorrectes,
        algebraTotal
      });

      // Mettre à jour les statistiques de l'utilisateur dans la base de données
      const utilisateurMisAJour = await stockage.mettreAJourStatsUtilisateur(req.user.id, score, niveau);

      // Mettre à jour le fichier JSON des statistiques
      await userStatsService.updateStatsAfterGame(String(req.user.id), {
        score,
        exercices: exercices || [],
        duree: tempsReponseMoyen * totalQuestions // Durée totale estimée
      });

      req.login(utilisateurMisAJour, (err) => {
        if (err) return res.status(500).send(err.message);
        res.json({
          enregistrementPartie,
          niveauAugmente: false,
          nouveauNiveau: niveau
        });
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la partie:', error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement de la partie" });
    }
  });

  // Route pour exporter les stats de l'utilisateur
  app.get("/api/export-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const filePath = await userStatsService.exportUserStatsToFile(String(req.user.id));
      res.status(200).json({ 
        message: "Statistiques exportées avec succès", 
        filePath: filePath 
      });
    } catch (error) {
      console.error('Erreur lors de l\'exportation des stats:', error);
      res.status(500).json({ message: "Erreur lors de l'exportation des statistiques" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getMeilleurType(partie: any): string {
  const types = [
    { nom: 'addition', correctes: partie.additionCorrectes, total: partie.additionTotal },
    { nom: 'soustraction', correctes: partie.soustractionCorrectes, total: partie.soustractionTotal },
    { nom: 'multiplication', correctes: partie.multiplicationCorrectes, total: partie.multiplicationTotal },
    { nom: 'division', correctes: partie.divisionCorrectes, total: partie.divisionTotal },
    { nom: 'puissance', correctes: partie.puissanceCorrectes, total: partie.puissanceTotal },
    { nom: 'algebre', correctes: partie.algebraCorrectes, total: partie.algebraTotal }
  ];

  let meilleurType = '-';
  let meilleurePrecision = 0;
  const nombreMinimumQuestions = 2;  // Nombre minimum de questions pour considérer un type

  types.forEach(type => {
    if (type.total >= nombreMinimumQuestions) {
      const precision = (type.correctes / type.total) * 100;
      // On ne met à jour le meilleur type que si la précision est strictement meilleure
      // ou si elle est égale mais avec plus de questions
      if (precision > meilleurePrecision || 
          (precision === meilleurePrecision && type.total > types.find(t => t.nom === meilleurType)?.total)) {
        meilleurePrecision = precision;
        meilleurType = type.nom;
      }
    }
  });

  return meilleurType;
}