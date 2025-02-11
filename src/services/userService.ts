import axios from 'axios';

export interface User {
  id: string;
  pseudo: string;
  email: string;
  createdAt: string;
  lastLogin: string;
}

class UserService {
  private readonly API_URL = 'http://localhost:3001/api';

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
    const response = await axios.post(`${this.API_URL}/users`, user);
    return response.data;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await axios.put(`${this.API_URL}/users/${userId}`, updates);
    return response.data;
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const response = await axios.get(`${this.API_URL}/users/${userId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getUserByPseudo(pseudo: string): Promise<User | null> {
    try {
      const response = await axios.get(`${this.API_URL}/users/pseudo/${pseudo}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const response = await axios.get(`${this.API_URL}/users`);
    return response.data;
  }
}

export const userService = new UserService();
