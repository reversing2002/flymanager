import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { ROLE_GROUPS } from '../../types/roles';
import type { Role } from '../../types/roles';

export async function createAuthUsers() {
  try {
    // First check if users already exist
    const { data: existingUsers } = await supabase
      .from('users')
      .select('login');

    // If we have users, skip creation
    if (existingUsers && existingUsers.length > 0) {
      console.log('Users already exist, skipping creation');
      return true;
    }

    // Create users in the users table
    const users = [
      {
        id: uuidv4(),
        first_name: 'Admin',
        last_name: 'System',
        email: 'admin@flymanager.com',
        role: ROLE_GROUPS.ADMIN,
        login: 'admin',
        password: 'admin123'
      },
      {
        id: uuidv4(),
        first_name: 'Marie',
        last_name: 'Martin',
        email: 'instructor@flymanager.com',
        role: ROLE_GROUPS.INSTRUCTOR,
        login: 'instructor',
        password: 'instructor123'
      },
      {
        id: uuidv4(),
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'pilot@flymanager.com',
        role: ROLE_GROUPS.PILOT,
        login: 'pilot',
        password: 'pilot123'
      },
      {
        id: uuidv4(),
        first_name: 'Pierre',
        last_name: 'Dubois',
        email: 'mechanic@flymanager.com',
        role: ROLE_GROUPS.MECHANIC,
        login: 'mechanic',
        password: 'mechanic123'
      }
    ];

    // Insert users into the users table
    const { error: usersError } = await supabase
      .from('users')
      .insert(users);

    if (usersError) {
      console.error('Error creating users:', usersError);
      throw usersError;
    }

    console.log('Users created successfully');
    return true;
  } catch (error) {
    console.error('Failed to create users:', error);
    return false;
  }
}

export const createUser = async (
  email: string,
  password: string,
  role: Role
) => {
  try {
    const { data: auth, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;

    const { error: insertError } = await supabase.from('users').insert([
      {
        id: auth.user?.id,
        email,
        role,
      },
    ]);

    if (insertError) throw insertError;

    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error };
  }
};