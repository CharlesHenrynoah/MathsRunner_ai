import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { csvManager } from '../utils/csvManager';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 heures

interface StoredUser {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

class AuthService {
  private static instance: AuthService;

  private constructor() {
    this.cleanExpiredToken();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private validateLoginInput(credentials: LoginCredentials): void {
    if (!credentials.identifier?.trim() || !credentials.password) {
      throw new Error('Veuillez remplir tous les champs');
    }

    if (credentials.password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }
  }

  private validateRegisterInput(credentials: RegisterCredentials): void {
    if (!credentials.username?.trim() || !credentials.email?.trim() || 
        !credentials.password || !credentials.confirmPassword) {
      throw new Error('Veuillez remplir tous les champs');
    }

    if (credentials.password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (credentials.username.length < 3) {
      throw new Error('Le pseudo doit contenir au moins 3 caractères');
    }

    if (!this.isValidEmail(credentials.email)) {
      throw new Error('Adresse email invalide');
    }

    if (credentials.password !== credentials.confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      this.validateLoginInput(credentials);

      const identifier = credentials.identifier.trim();
      const isEmail = this.isValidEmail(identifier);
      
      const user = csvManager.validateUser(
        isEmail ? identifier.toLowerCase() : identifier,
        credentials.password
      ) as StoredUser | null;
      
      if (!user) {
        throw new Error('Identifiants invalides');
      }

      return this.createUserSession(user);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur lors de la connexion');
    }
  }

  async register(credentials: RegisterCredentials): Promise<User> {
    try {
      this.validateRegisterInput(credentials);

      const email = credentials.email.trim().toLowerCase();
      const username = credentials.username.trim();

      // Vérifie d'abord si l'email existe
      const userByEmail = csvManager.validateUser(email, '');
      if (userByEmail) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Vérifie ensuite si le pseudo existe
      const userByUsername = csvManager.validateUser(username, '');
      if (userByUsername) {
        throw new Error('Ce pseudo est déjà utilisé');
      }

      // Crée le nouvel utilisateur avec le bon typage
      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        username,
        email,
        password: credentials.password,
        createdAt: new Date().toISOString()
      };

      // Ajoute l'utilisateur au CSV avec gestion d'erreur
      try {
        csvManager.addUser(newUser);
      } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
        throw new Error('Erreur lors de la création du compte');
      }

      return this.createUserSession(newUser);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur lors de l\'inscription');
    }
  }

  private createUserSession(user: StoredUser): User {
    const token = this.generateToken();
    const userData: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      token
    };

    this.setToken(token);
    this.setUser(userData);

    return userData;
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      if (!this.isValidToken()) {
        this.logout();
        return null;
      }

      return user;
    } catch {
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!(this.isValidToken() && this.getCurrentUser());
  }

  private setToken(token: string): void {
    const tokenData = {
      value: token,
      expiry: Date.now() + TOKEN_EXPIRY
    };
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokenData));
  }

  private isValidToken(): boolean {
    try {
      const tokenStr = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!tokenStr) return false;

      const tokenData = JSON.parse(tokenStr);
      return Date.now() <= tokenData.expiry;
    } catch {
      return false;
    }
  }

  private setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private generateToken(): string {
    return crypto.randomUUID();
  }

  private cleanExpiredToken(): void {
    if (!this.isValidToken()) {
      this.logout();
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}

export const authService = AuthService.getInstance();
