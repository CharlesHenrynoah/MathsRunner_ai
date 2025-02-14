import { Utilisateur, InsertionUtilisateur, EnregistrementPartie } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs/promises";
import path from "path";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUtilisateur(id: number): Promise<Utilisateur | undefined>;
  getUtilisateurParNom(nomUtilisateur: string): Promise<Utilisateur | undefined>;
  creerUtilisateur(utilisateur: InsertionUtilisateur): Promise<Utilisateur>;
  mettreAJourStatsUtilisateur(idUtilisateur: number, score: number, niveau: number): Promise<Utilisateur>;
  ajouterEnregistrementPartie(enregistrement: Omit<EnregistrementPartie, "id" | "dateCreation">): Promise<EnregistrementPartie>;
  getStatsUtilisateur(idUtilisateur: number): Promise<EnregistrementPartie[]>;
  getEnregistrementsPartie(idUtilisateur: number): Promise<EnregistrementPartie[]>;
  sessionStore: session.Store;
}

export class StockageJson implements IStorage {
  private dossierDonnees: string;
  sessionStore: session.Store;
  private idCourant: number;
  private idEnregistrementPartieCourant: number;

  constructor() {
    this.dossierDonnees = path.join(process.cwd(), 'donnees');
    this.assurerDossierDonnees();
    this.idCourant = this.getIdMaxCourant();
    this.idEnregistrementPartieCourant = 1; // Initialize with 1, will be updated when needed
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    // Initialize the real ID asynchronously
    this.initializeIds();
  }

  private async initializeIds() {
    try {
      this.idEnregistrementPartieCourant = await this.getIdMaxEnregistrementPartieCourant();
    } catch (error) {
      console.error('Erreur initialisation IDs:', error);
    }
  }

  private async assurerDossierDonnees() {
    try {
      await fs.mkdir(this.dossierDonnees, { recursive: true });
      
      // Initialize files with empty arrays if they don't exist
      const files = await fs.readdir(this.dossierDonnees);
      const partiesFiles = files.filter(f => f.startsWith('parties_'));
      
      for (const file of partiesFiles) {
        const filePath = path.join(this.dossierDonnees, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          JSON.parse(content); // Test if valid JSON
        } catch (e) {
          // If file doesn't exist or is invalid JSON, initialize it
          await fs.writeFile(filePath, '[]', 'utf-8');
        }
      }
    } catch (error) {
      console.error('Erreur création dossier données:', error);
    }
  }

  private getIdMaxCourant(): number {
    return 1;
  }

  private async getIdMaxEnregistrementPartieCourant(): Promise<number> {
    try {
      const files = await fs.readdir(this.dossierDonnees);
      const partiesFiles = files.filter(f => f.startsWith('parties_'));
      
      let maxId = 0;
      for (const file of partiesFiles) {
        const content = await fs.readFile(path.join(this.dossierDonnees, file), 'utf-8');
        const parties = JSON.parse(content);
        if (Array.isArray(parties)) {
          for (const partie of parties) {
            if (partie.id > maxId) maxId = partie.id;
          }
        }
      }
      return maxId + 1;
    } catch (error) {
      console.error('Erreur lecture ID max enregistrement:', error);
      return 1;
    }
  }

  private getCheminFichierUtilisateur(idUtilisateur: number): string {
    return path.join(this.dossierDonnees, `utilisateur_${idUtilisateur}.json`);
  }

  private getCheminFichierEnregistrementsPartie(idUtilisateur: number): string {
    return path.join(this.dossierDonnees, `parties_${idUtilisateur}.json`);
  }

  async getUtilisateur(id: number): Promise<Utilisateur | undefined> {
    try {
      const donnees = await fs.readFile(this.getCheminFichierUtilisateur(id), 'utf-8');
      return JSON.parse(donnees);
    } catch {
      return undefined;
    }
  }

  async getUtilisateurParNom(nomUtilisateur: string): Promise<Utilisateur | undefined> {
    try {
      const fichiers = await fs.readdir(this.dossierDonnees);
      for (const fichier of fichiers) {
        if (fichier.startsWith('utilisateur_')) {
          const donnees = await fs.readFile(path.join(this.dossierDonnees, fichier), 'utf-8');
          const utilisateur = JSON.parse(donnees);
          if (utilisateur.nomUtilisateur === nomUtilisateur) {
            return utilisateur;
          }
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async creerUtilisateur(insertUtilisateur: InsertionUtilisateur): Promise<Utilisateur> {
    const id = ++this.idCourant;
    const utilisateur: Utilisateur = {
      ...insertUtilisateur,
      id,
      niveauActuel: 1,
      scoreTotal: 0,
      partiesJouees: 0,
      meilleurScore: 0
    };

    await fs.writeFile(
      this.getCheminFichierUtilisateur(id),
      JSON.stringify(utilisateur, null, 2)
    );

    await fs.writeFile(
      this.getCheminFichierEnregistrementsPartie(id),
      JSON.stringify([], null, 2)
    );

    return utilisateur;
  }

  async mettreAJourStatsUtilisateur(idUtilisateur: number, score: number, niveau: number): Promise<Utilisateur> {
    const utilisateur = await this.getUtilisateur(idUtilisateur);
    if (!utilisateur) throw new Error("Utilisateur non trouvé");

    const utilisateurMisAJour: Utilisateur = {
      ...utilisateur,
      niveauActuel: Math.max(utilisateur.niveauActuel, niveau),
      scoreTotal: utilisateur.scoreTotal + score,
      partiesJouees: utilisateur.partiesJouees + 1,
      meilleurScore: Math.max(utilisateur.meilleurScore, score)
    };

    await fs.writeFile(
      this.getCheminFichierUtilisateur(idUtilisateur),
      JSON.stringify(utilisateurMisAJour, null, 2)
    );

    return utilisateurMisAJour;
  }

  async ajouterEnregistrementPartie(enregistrement: Omit<EnregistrementPartie, "id" | "dateCreation">): Promise<EnregistrementPartie> {
    // Définir un type de problème par défaut si non fourni
    const typeProbleme = enregistrement.typeProbleme || "Non spécifié";

    // Get the current max ID to ensure we don't have conflicts
    this.idEnregistrementPartieCourant = await this.getIdMaxEnregistrementPartieCourant();
    
    const nouvelEnregistrement: EnregistrementPartie = {
      ...enregistrement,
      typeProbleme,
      id: this.idEnregistrementPartieCourant++,
      dateCreation: new Date()
    };

    const cheminFichier = path.join(this.dossierDonnees, `parties_${enregistrement.idUtilisateur}.json`);
    
    try {
      let parties: EnregistrementPartie[] = [];
      try {
        const contenu = await fs.readFile(cheminFichier, 'utf-8');
        parties = JSON.parse(contenu);
        // Filtrer les enregistrements invalides existants
        parties = parties.filter(p => p && typeof p === 'object');
      } catch (e) {
        // File doesn't exist or is invalid, start with empty array
      }
      
      parties.push(nouvelEnregistrement);
      await fs.writeFile(cheminFichier, JSON.stringify(parties, null, 2), 'utf-8');
      return nouvelEnregistrement;
    } catch (error) {
      console.error('Erreur ajout enregistrement partie:', error);
      throw error;
    }
  }

  async getEnregistrementsPartie(idUtilisateur: number): Promise<EnregistrementPartie[]> {
    try {
      const cheminFichier = this.getCheminFichierEnregistrementsPartie(idUtilisateur);
      const contenu = await fs.readFile(cheminFichier, 'utf-8');
      const parties = JSON.parse(contenu);
      // Filtrer les enregistrements invalides
      return parties.filter((p: EnregistrementPartie) => p.typeProbleme && p.typeProbleme.length > 0)
        .map((p: EnregistrementPartie) => ({
          ...p,
          dateCreation: new Date(p.dateCreation)
        }));
    } catch {
      return [];
    }
  }

  async getStatsUtilisateur(idUtilisateur: number): Promise<EnregistrementPartie[]> {
    return this.getEnregistrementsPartie(idUtilisateur);
  }
}

export const stockage = new StockageJson();