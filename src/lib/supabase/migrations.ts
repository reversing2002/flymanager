import { createAuthUsers } from './auth';
import { supabase } from '../supabase';
import { SYSTEM_ROLE_GROUPS } from '../../types/roles';
import { initializeDefaultChatRooms } from './chat';

export async function migrateData() {
  try {
    console.log('Starting data migration...');

    // Create flight types first
    console.log('Creating flight types...');
    await createFlightTypes();

    // Create test accounts
    console.log('Creating test accounts...');
    await createTestAccounts();

    // Get users to create qualifications
    console.log('Creating qualifications for users...');
    const { data: users } = await supabase
      .from('users')
      .select('id');

    if (users) {
      // Create qualifications for each user
      for (const user of users) {
        await createPilotQualifications(user.id);
      }
    }

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

async function createFlightTypes() {
  const defaultTypes = [
    { 
      id: 'local',
      name: 'Vol Local', 
      description: 'Vol local sans instruction',
      requires_instructor: false,
      accounting_category: 'REGULAR'
    },
    { 
      id: 'instruction',
      name: 'Instruction', 
      description: 'Vol d\'instruction avec instructeur',
      requires_instructor: true,
      accounting_category: 'INSTRUCTION'
    },
    // ... other flight types
  ];

  // Check if flight types already exist
  const { data: existingTypes } = await supabase
    .from('flight_types')
    .select('*');

  if (existingTypes && existingTypes.length > 0) {
    console.log('Flight types already exist, updating them...');
    
    for (const type of defaultTypes) {
      const { error } = await supabase
        .from('flight_types')
        .upsert({
          id: type.id,
          name: type.name,
          description: type.description,
          requires_instructor: type.requires_instructor,
          accounting_category: type.accounting_category
        });

      if (error) throw error;
    }
    return;
  }

  // Insert new flight types
  for (const type of defaultTypes) {
    const { error } = await supabase
      .from('flight_types')
      .insert(type);

    if (error) throw error;
  }
}

async function createTestAccounts() {
  const testAccounts = [
    {
      first_name: 'Admin',
      last_name: 'System',
      email: 'admin@flymanager.com',
      roles: [SYSTEM_ROLE_GROUPS.ADMIN[0]],
      login: 'admin',
      password: 'admin123'
    },
    {
      first_name: 'Marie',
      last_name: 'Martin',
      email: 'instructor@flymanager.com',
      roles: [SYSTEM_ROLE_GROUPS.INSTRUCTOR[0]],
      login: 'instructor',
      password: 'instructor123'
    },
    {
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'pilot@flymanager.com',
      roles: [SYSTEM_ROLE_GROUPS.PILOT[0]],
      login: 'pilot',
      password: 'pilot123'
    },
    {
      first_name: 'Pierre',
      last_name: 'Dubois',
      email: 'mechanic@flymanager.com',
      roles: [SYSTEM_ROLE_GROUPS.MECHANIC[0]],
      login: 'mechanic',
      password: 'mechanic123'
    }
  ];

  // Check if users already exist
  const { data: existingUsers } = await supabase
    .from('users')
    .select('login');

  if (existingUsers && existingUsers.length > 0) {
    console.log('Users already exist, skipping creation');
    return;
  }

  // Insert test accounts
  const { error } = await supabase
    .from('users')
    .insert(testAccounts);

  if (error) {
    console.error('Error creating test accounts:', error);
    throw error;
  }
  console.log('Test accounts created successfully');
}

async function createPilotQualifications(userId: string) {
  const qualifications = [
    { code: 'TW', name: 'Train classique' },
    { code: 'EFIS', name: 'Système d\'information éléctronique de vol' },
    { code: 'SLPC', name: 'Mono-manette de puissance' },
    { code: 'RU', name: 'Train rentrant' },
    { code: 'VP', name: 'Pas variable' }
  ];

  const { error } = await supabase
    .from('pilot_qualifications')
    .insert(qualifications.map(qual => ({
      user_id: userId,
      code: qual.code,
      name: qual.name,
      has_qualification: false
    })));

  if (error) throw error;
}

export async function setupSupabase() {
  try {
    console.log('Starting Supabase setup...');

    // First check if tables exist and have data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count');

    if (usersError) {
      console.error('Error checking users table:', usersError);
      return false;
    }

    // If we already have data, skip setup
    if (users && users.length > 0) {
      console.log('Database already initialized');
      return true;
    }

    // 1. Create auth users first
    console.log('Creating auth users...');
    const authSuccess = await createAuthUsers();
    if (!authSuccess) {
      console.error('Failed to create auth users');
      return false;
    }

    // 2. Migrate data
    console.log('Migrating data...');
    const migrationSuccess = await migrateData();
    if (!migrationSuccess) {
      console.error('Failed to migrate data');
      return false;
    }

    // 3. Initialize default chat rooms
    console.log('Initializing default chat rooms...');
    const chatSuccess = await initializeDefaultChatRooms();
    if (!chatSuccess) {
      console.error('Failed to initialize chat rooms');
      return false;
    }

    console.log('Supabase setup completed successfully');
    return true;
  } catch (error) {
    console.error('Setup error:', error);
    return false;
  }
}