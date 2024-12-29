import { supabase } from "../supabase";
import { adminClient } from "../supabase/adminClient";
import type { User } from "../../types/database";
import { addMonths, isAfter } from 'date-fns';

export async function updateUser(
  data: Partial<User> & { id: string }
): Promise<void> {
  try {
    console.log("[updateUser] ====== UPDATE DEBUG ======");
    console.log("[updateUser] Raw input data:", JSON.stringify(data, null, 2));

    // Créer un objet de données sanitisées
    const sanitizedData: Partial<User> = {
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      email: data.email || null,
      phone: data.phone || null,
      gender: data.gender || null,
      birth_date: data.birth_date || null,
      image_url: data.image_url || null,
      instructor_rate: data.instructor_rate !== undefined ? data.instructor_rate : undefined,
      instructor_fee: data.instructor_fee !== undefined ? data.instructor_fee : undefined,
      updated_at: new Date().toISOString(),
    };

    console.log("[updateUser] Sanitized data:", JSON.stringify(sanitizedData, null, 2));
    console.log("[updateUser] instructor_rate value:", sanitizedData.instructor_rate, typeof sanitizedData.instructor_rate);

    // 1. Mettre à jour les informations de base de l'utilisateur
    const { data: updateResult, error: userError } = await supabase
      .from("users")
      .update(sanitizedData)
      .eq("id", data.id)
      .select();

    console.log("[updateUser] Update result:", updateResult);

    if (userError) {
      console.error("[updateUser] Error updating user:", userError);
      throw userError;
    }

    // 2. Si des rôles sont fournis, les mettre à jour via la RPC
    if (data.roles) {
      console.log("Updating user roles:", data.roles);

      const { error: rolesError } = await supabase
        .rpc('update_user_groups', { 
          p_user_id: data.id,
          p_groups: data.roles
        });

      if (rolesError) {
        console.error("Error updating user roles:", rolesError);
        throw rolesError;
      }
    }

    console.log("User update completed successfully");
  } catch (error) {
    console.error("[updateUser] Unexpected error:", error);
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    console.log("Getting user by ID:", id);

    // 1. Récupérer les données de l'utilisateur avec ses relations
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `
        *,
        instructor_rate,
        club_members!inner(
          club:clubs(
            id,
            name
          )
        ),
        pilot_licenses (
          id,
          license_type:license_types (
            id,
            name,
            description,
            category
          ),
          number,
          authority,
          issued_at,
          expires_at,
          scan_id
        )
      `)
      .eq("id", id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      throw userError;
    }

    if (!userData) {
      return null;
    }

    // Fetch medicals separately
    let medicalsData = [];
    const { data: medicals, error: medicalsError } = await supabase
      .from("medicals")
      .select(`
        id,
        medical_type_id,
        medical_type:medical_types (
          id,
          name,
          description,
          validity_period,
          requires_end_date
        ),
        obtained_at,
        expires_at,
        scan_id
      `)
      .eq("user_id", id);

    if (medicalsError) {
      console.error("Error fetching medicals:", medicalsError);
      console.warn("Continuing with empty medicals array due to error");
    } else {
      medicalsData = medicals || [];
    }

    // 2. Récupérer les rôles de l'utilisateur
    const { data: userGroups, error: groupsError } = await supabase
      .rpc('get_user_groups', { user_id: id });

    if (groupsError) {
      console.error("Error fetching user groups:", groupsError);
      throw groupsError;
    }

    // 3. Transformer les données
    const user: User = {
      ...userData,
      medicals: medicalsData,
      roles: userGroups || [],
      club: userData.club_members?.[0]?.club || null,
      full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
    };

    return user;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      user_group_memberships (
        group:user_groups(name)
      ),
      club_members!user_id (
        club:club_id (
          id,
          name
        )
      )
    `);

  if (error) throw error;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
  };

  return data.map((user) => ({
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birth_date: formatDate(user.birth_date),
    image_url: user.image_url,
    default_schedule: user.default_schedule,
    roles: user.user_group_memberships?.map(membership => membership.group.name) || [],
    membership_expiry: formatDate(user.membership_expiry),
    login: user.login,
    password: user.password,
    balance: user.balance,
    instructor_rate: user.instructor_rate,
    instructor_fee: user.instructor_fee,
    created_at: user.created_at,
    updated_at: user.updated_at,
    club: user.club,
  }));
}

export async function getMembersWithBalance(): Promise<User[]> {
  try {
    // 1. Récupérer l'utilisateur connecté pour avoir son club
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.id) throw new Error("User not authenticated");

    // 2. Récupérer le club de l'utilisateur connecté
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select(`
        club_members!inner(
          club_id
        )
      `)
      .eq('auth_id', currentUser.id)
      .single();

    if (userError) {
      console.error("Error fetching current user club:", userError);
      throw userError;
    }

    const userClubId = currentUserData?.club_members?.[0]?.club_id;
    if (!userClubId) throw new Error("User has no club");

    // 3. Récupérer les membres du même club avec leurs cotisations en une seule requête
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        instructor_rate,
        auth_id,
        image_url,
        club_members!inner(
          club:clubs(
            id,
            name
          )
        ),
        member_contributions(
          id,
          valid_from,
          valid_until,
          created_at,
          document_url,
          account_entry_id
        )
      `)
      .eq('club_members.club_id', userClubId)
      .order('first_name');

    if (membersError) {
      console.error("Error fetching members:", membersError);
      throw membersError;
    }

    if (!members) return [];

    // 4. Transformer les données
    const membersWithContributions = members.map(member => {
      // Trier les cotisations par date de validité
      const sortedContributions = member.member_contributions
        ? [...member.member_contributions].sort(
            (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
          )
        : [];

      // Vérifier si la dernière cotisation est valide
      const lastContribution = sortedContributions[0];
      const isValid = lastContribution
        ? isAfter(new Date(lastContribution.valid_until), new Date())
        : false;

      return {
        ...member,
        contributions: sortedContributions,
        membership_status: isValid ? 'valid' : 'expired',
        club: member.club_members?.[0]?.club || null,
        full_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown'
      };
    });

    return membersWithContributions;
  } catch (error) {
    console.error("Error in getMembersWithBalance:", error);
    throw error;
  }
}

export async function getClubStudents(instructorId: string): Promise<User[]> {
  // Récupérer d'abord le club de l'instructeur
  const { data: instructorClub } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", instructorId)
    .single();

  if (!instructorClub) return [];

  // Récupérer tous les élèves du même club
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      user_group_memberships (
        group:user_groups(name)
      ),
      club_members!inner (
        club:club_id (
          id,
          name
        )
      )
    `)
    .eq("club_members.club_id", instructorClub.club_id)
    .in("user_group_memberships.group.name", ["STUDENT"]);

  if (error) throw error;

  return data;
}

function generateRandomPassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

export async function createMember(data: {
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}): Promise<{ password: string }> {
  try {
    const { firstName, lastName, email, roles } = data;
    const login = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const password = generateRandomPassword();
    console.log("Generated password:", password);

    // Get current user's club
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non connecté");
    }

    const { data: adminClub, error: clubError } = await adminClient
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id)
      .single();

    if (clubError) {
      throw clubError;
    }

    // First create the user in public.users to get the database ID
    const { data: newUser, error: createError } = await adminClient
      .from("users")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        login: login,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    // Create the auth user using the custom RPC function that handles the ID mapping
    const { error: authError } = await adminClient.rpc("create_auth_user", {
      p_email: email,
      p_password: password,
      p_login: login,
      p_role: 'authenticated',  // Force role to authenticated
      p_user_id: newUser.id,
      p_user_metadata: {
        login: login,
        password: password,
        first_name: firstName,
        last_name: lastName,
        email: email,
        full_name: `${firstName} ${lastName}`,
        app_url: window.location.origin  // Pour les liens dans l'email
      }
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      // Cleanup the created user if auth fails
      await adminClient.from("users").delete().eq("id", newUser.id);
      throw authError;
    }

    // Update user roles using the RPC function
    if (roles.length > 0) {
      const { error: rolesError } = await adminClient
        .rpc('update_user_groups', {
          p_user_id: newUser.id,
          p_groups: roles
        });

      if (rolesError) {
        console.error("Error updating user roles:", rolesError);
        // Cleanup if role assignment fails
        await adminClient.from("users").delete().eq("id", newUser.id);
        throw rolesError;
      }
    }

    // Add user to club_members
    const { error: clubMemberError } = await adminClient
      .from("club_members")
      .insert({
        user_id: newUser.id,
        club_id: adminClub.club_id,
        joined_at: new Date().toISOString()
      });

    if (clubMemberError) {
      console.error("Error adding user to club:", clubMemberError);
      // Cleanup everything if club member creation fails
      await adminClient.from("users").delete().eq("id", newUser.id);
      throw clubMemberError;
    }

    // Return the generated password
    return { password };
  } catch (error) {
    console.error("Error in createMember:", error);
    throw error;
  }
}

export async function createAuthAccount(data: {
  firstName: string;
  lastName: string;
  email: string;
  userId: string;
}): Promise<{ password: string }> {
  try {
    const { firstName, lastName, email, userId } = data;
    const login = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const password = generateRandomPassword();
    console.log("Generated password for auth account:", password);

    // Create the auth user using the custom RPC function that handles the ID mapping
    const { error: authError } = await adminClient.rpc("create_auth_user", {
      p_email: email,
      p_password: password,
      p_login: login,
      p_role: 'authenticated',  // Force role to authenticated
      p_user_id: userId,
      p_user_metadata: {
        login: login,
        password: password,
        first_name: firstName,
        last_name: lastName,
        email: email,
        full_name: `${firstName} ${lastName}`,
        app_url: window.location.origin
      }
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      throw authError;
    }

    return { password };
  } catch (error) {
    console.error("Error in createAuthAccount:", error);
    throw error;
  }
}
