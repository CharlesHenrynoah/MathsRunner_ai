import axios from 'axios';

export interface User {
  id: string;
  pseudo: string;
  email: string;
  createdAt: string;
  lastLogin: string;
}

class AuthService {
  private readonly API_URL = 'http://localhost:3001/api';
  private currentUser: User | null = null;

  constructor() {
    // Charger l'utilisateur depuis le localStorage au démarrage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await axios.post<User>(`${this.API_URL}/auth/login`, { email, password });
      this.currentUser = response.data;
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return response.data;
    } catch (error) {
      throw new Error('Échec de la connexion');
    }
  }

  async register(pseudo: string, email: string, password: string): Promise<User> {
    try {
      const response = await axios.post<User>(`${this.API_URL}/auth/register`, {
        pseudo,
        email,
        password
      });
      this.currentUser = response.data;
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return response.data;
    } catch (error) {
      throw new Error('Échec de l\'inscription');
    }
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authService = new AuthService();
