import { getDatabase } from './db';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'PILOT' | 'INSTRUCTOR' | 'MECHANIC';
}

export async function login(login: string, password: string): Promise<AuthUser | null> {
  const db = await getDatabase();
  
  try {
    const result = db.exec(`
      SELECT id, firstName, lastName, email, role 
      FROM users 
      WHERE login = ? AND password = ?
    `, [login, password]);

    if (!result[0]?.values.length) return null;

    const row = result[0].values[0];
    return {
      id: row[0],
      firstName: row[1],
      lastName: row[2],
      email: row[3],
      role: row[4],
    };
  } catch (error) {
    console.error('Error during login:', error);
    return null;
  }
}