import { supabase } from '../supabase';

// Service pour les opérations administratives
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AdminService {
  deleteUser: (userId: string) => Promise<void>;
  createUser: (data: {
    email: string;
    password: string;
    userData: any;
    roles: string[];
    clubId: string;
  }) => Promise<any>;
  updateUser: (userId: string, userData: any) => Promise<any>;
  getUserByEmail: (email: string) => Promise<any>;
  getAuthUser: (userId: string) => Promise<any>;
  listUsers: (clubId: string) => Promise<any>;
  getAuthToken: () => Promise<string>;
}

// Fonction utilitaire pour récupérer le token
const getAuthToken = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Non authentifié');
  }
  return session.access_token;
};

export const adminService: AdminService = {
  async deleteUser(userId: string) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    }
  },

  async createUser(data) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création de l\'utilisateur');
    }

    return response.json();
  },

  async updateUser(userId: string, userData: any) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la mise à jour de l\'utilisateur');
    }

    return response.json();
  },

  async getUserByEmail(email: string) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/admin/users/by-email/${email}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération de l\'utilisateur');
    }

    return response.json();
  },

  async getAuthUser(userId: string) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/admin/users/${userId}/auth`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération des informations d\'authentification');
    }

    return response.json();
  },

  async listUsers(clubId: string) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/admin/users?clubId=${clubId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération des utilisateurs');
    }

    return response.json();
  },

  async getAuthToken() {
    return getAuthToken();
  },
};
