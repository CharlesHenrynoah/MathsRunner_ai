import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const utilisateurs = pgTable("utilisateurs", {
  id: serial("id").primaryKey(),
  nomUtilisateur: text("nom_utilisateur").notNull().unique(),
  email: text("email").notNull().unique(),
  motDePasse: text("mot_de_passe").notNull(),
  niveauActuel: integer("niveau_actuel").notNull().default(1),
  scoreTotal: integer("score_total").notNull().default(0),
  partiesJouees: integer("parties_jouees").notNull().default(0),
  meilleurScore: integer("meilleur_score").notNull().default(0)
});

export const enregistrementsPartie = pgTable("enregistrements_partie", {
  id: serial("id").primaryKey(),
  idUtilisateur: integer("id_utilisateur").notNull(),
  score: integer("score").notNull(),
  niveau: integer("niveau").notNull(),
  typeProbleme: text("type_probleme").notNull(),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
  totalQuestions: integer("total_questions").notNull(),
  totalCorrectes: integer("total_correctes").notNull(),
  totalIncorrectes: integer("total_incorrectes").notNull(),
  tempsReponseeMoyen: real("temps_reponse_moyen").notNull(),
  additionCorrectes: integer("addition_correctes").notNull().default(0),
  additionTotal: integer("addition_total").notNull().default(0),
  soustractionCorrectes: integer("soustraction_correctes").notNull().default(0),
  soustractionTotal: integer("soustraction_total").notNull().default(0),
  multiplicationCorrectes: integer("multiplication_correctes").notNull().default(0),
  multiplicationTotal: integer("multiplication_total").notNull().default(0),
  divisionCorrectes: integer("division_correctes").notNull().default(0),
  divisionTotal: integer("division_total").notNull().default(0),
  puissanceCorrectes: integer("puissance_correctes").notNull().default(0),
  puissanceTotal: integer("puissance_total").notNull().default(0),
  algebraCorrectes: integer("algebre_correctes").notNull().default(0),
  algebraTotal: integer("algebre_total").notNull().default(0)
});

// Schéma pour la connexion
export const schemaConnexion = z.object({
  nomUtilisateur: z.string().min(1, "Le nom d'utilisateur est requis"),
  motDePasse: z.string().min(1, "Le mot de passe est requis")
});

// Schéma pour l'inscription
export const schemaInsertionUtilisateur = createInsertSchema(utilisateurs)
  .pick({
    nomUtilisateur: true,
    email: true,
    motDePasse: true
  })
  .extend({
    confirmationMotDePasse: z.string()
  })
  .refine((data) => data.motDePasse === data.confirmationMotDePasse, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmationMotDePasse"],
  });

export const schemaInsertionPartie = createInsertSchema(enregistrementsPartie);

// Type aliases pour la compatibilité avec le code existant
export const insertUserSchema = schemaInsertionUtilisateur;
export const loginSchema = schemaConnexion;
export type InsertUser = z.infer<typeof schemaInsertionUtilisateur>;
export type LoginData = z.infer<typeof schemaConnexion>;
export type User = typeof utilisateurs.$inferSelect;
export type GameRecord = typeof enregistrementsPartie.$inferSelect;

// Export des nouveaux types en français
export type InsertionUtilisateur = z.infer<typeof schemaInsertionUtilisateur>;
export type DonneesConnexion = z.infer<typeof schemaConnexion>;
export type Utilisateur = typeof utilisateurs.$inferSelect;
export type EnregistrementPartie = typeof enregistrementsPartie.$inferSelect;

// Types pour les statistiques calculées
export interface StatistiquesPartie {
  meilleurScore: number;
  scoreMoyen: number;
  totalParties: number;
  totalCorrectes: number;
  totalQuestions: number;
  totalIncorrectes: number;
  tempsReponseMoyen: number;
  precisionGlobale: number;
  statsParType: {
    addition: { correctes: number; total: number; precision: number };
    soustraction: { correctes: number; total: number; precision: number };
    multiplication: { correctes: number; total: number; precision: number };
    division: { correctes: number; total: number; precision: number };
    puissance: { correctes: number; total: number; precision: number };
    algebre: { correctes: number; total: number; precision: number };
  };
  dernièrePartie: {
    score: number;
    niveau: number;
    correctes: number;
    incorrectes: number;
    tempsReponse: number;
    meilleurType: string;
  };
  partiesRecentes: Array<{
    id: number;
    score: number;
    niveau: number;
    typeProbleme: string;
    dateCreation: string;
  }>;
}