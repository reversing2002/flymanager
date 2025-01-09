const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Création du client Supabase admin
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware de vérification admin
const checkAdminRole = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    
    if (error) {
      console.error('❌ Erreur auth.getUser:', error);
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    if (!user) {
      console.error('❌ Utilisateur non trouvé');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Vérifier si l'utilisateur est admin via user_group_memberships
    const { data: groups, error: groupsError } = await adminClient
      .from('user_group_memberships')
      .select(`
        user_groups (
          code
        )
      `)
      .eq('user_id', user.id);

    if (groupsError) {
      console.error('❌ Erreur récupération groupes:', groupsError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const isAdmin = groups?.some(membership => membership.user_groups?.code === 'ADMIN');
    if (!isAdmin) {
      console.error('❌ Utilisateur non admin:', user.id);
      return res.status(403).json({ error: 'Accès refusé' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erreur middleware admin:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Liste des utilisateurs
router.get('/users', checkAdminRole, async (req, res) => {
  try {
    const { clubId } = req.query;
    
    if (!clubId) {
      return res.status(400).json({ error: 'Club ID requis' });
    }

    console.log('📋 Récupération des utilisateurs pour le club:', clubId);
    
    // Récupérer les membres du club
    const { data: members, error: membersError } = await adminClient
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId)
      .eq('status', 'ACTIVE');

    if (membersError) {
      console.error('❌ Erreur récupération membres:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    if (!members || members.length === 0) {
      console.log('ℹ️ Aucun membre trouvé pour ce club');
      return res.json({ data: [] });
    }

    // Récupérer les informations des utilisateurs
    const userIds = members.map(member => member.user_id);
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      return res.status(500).json({ error: usersError.message });
    }

    console.log('✅ Utilisateurs récupérés:', users.length);
    res.json({ data: users });
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Récupérer un utilisateur par email
router.get('/users/by-email/:email', checkAdminRole, async (req, res) => {
  try {
    const { email } = req.params;
    console.log('🔍 Recherche utilisateur par email:', email);
    
    const { data, error } = await adminClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Utilisateur non trouvé:', error);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log('✅ Utilisateur trouvé:', data.id);
    res.json({ data });
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// Vérifier l'utilisateur auth
router.get('/users/:userId/auth', checkAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Vérification auth pour utilisateur:', userId);
    
    const { data, error } = await adminClient
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (error || !data?.auth_id) {
      console.error('❌ Auth ID non trouvé:', error);
      return res.status(404).json({ error: 'Utilisateur auth non trouvé' });
    }

    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(data.auth_id);

    if (authError) {
      console.error('❌ Utilisateur auth non trouvé:', authError);
      return res.status(404).json({ error: 'Utilisateur auth non trouvé' });
    }

    console.log('✅ Utilisateur auth trouvé:', authUser.id);
    res.json({ data: authUser });
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de l\'utilisateur auth' });
  }
});

// Suppression d'un utilisateur
router.delete('/users/:userId', checkAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ Suppression utilisateur:', userId);
    
    // Récupérer l'auth_id
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Utilisateur non trouvé:', userError);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Supprimer l'utilisateur auth s'il existe
    if (user.auth_id) {
      console.log('🗑️ Suppression utilisateur auth:', user.auth_id);
      const { error: authError } = await adminClient.auth.admin.deleteUser(user.auth_id);
      if (authError) {
        console.error('❌ Erreur suppression auth:', authError);
        return res.status(400).json({ error: authError.message });
      }
    }

    // Supprimer l'utilisateur de la base de données
    const { error: dbError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('❌ Erreur suppression DB:', dbError);
      return res.status(400).json({ error: dbError.message });
    }
    
    console.log('✅ Utilisateur supprimé avec succès');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// Création d'un utilisateur
router.post('/users', checkAdminRole, async (req, res) => {
  try {
    const { email, password, userData, roles, clubId } = req.body;
    console.log('➕ Création utilisateur:', email);

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await adminClient
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.error('❌ Email déjà utilisé:', email);
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Générer un login unique à partir de l'email
    const login = email.split('@')[0];
    console.log('🔑 Login généré:', login);

    // Créer l'utilisateur dans la base de données
    const { data: newUser, error: createError } = await adminClient
      .from('users')
      .insert([{
        email,
        login,
        first_name: userData.first_name || login,
        last_name: userData.last_name || '',
        phone: userData.phone
      }])
      .select()
      .single();

    if (createError) {
      console.error('❌ Erreur création utilisateur:', createError);
      return res.status(400).json({ error: createError.message });
    }

    // Créer l'utilisateur auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        db_id: newUser.id,
      },
    });

    if (authError) {
      console.error('❌ Erreur création auth:', authError);
      // Nettoyer l'utilisateur créé si l'auth échoue
      await adminClient.from('users').delete().eq('id', newUser.id);
      return res.status(400).json({ error: authError.message });
    }

    // Mettre à jour l'auth_id dans la base de données
    const { error: updateError } = await adminClient
      .from('users')
      .update({ auth_id: authUser.user.id })
      .eq('id', newUser.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour auth_id:', updateError);
      // Nettoyer tout si la mise à jour échoue
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      await adminClient.from('users').delete().eq('id', newUser.id);
      return res.status(400).json({ error: updateError.message });
    }

    // Ajouter l'utilisateur au club
    const { error: clubError } = await adminClient
      .from('club_members')
      .insert([{
        user_id: newUser.id,
        club_id: clubId,
        status: 'ACTIVE'
      }]);

    if (clubError) {
      console.error('❌ Erreur ajout au club:', clubError);
      // Nettoyer tout si l'ajout au club échoue
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      await adminClient.from('users').delete().eq('id', newUser.id);
      return res.status(400).json({ error: clubError.message });
    }

    // Ajouter les groupes
    if (roles && roles.length > 0) {
      const { data: groups } = await adminClient
        .from('user_groups')
        .select('id, code')
        .in('code', roles);

      if (groups && groups.length > 0) {
        const { error: groupsError } = await adminClient
          .from('user_group_memberships')
          .insert(groups.map(group => ({
            user_id: newUser.id,
            group_id: group.id
          })));

        if (groupsError) {
          console.error('❌ Erreur ajout groupes:', groupsError);
          // Nettoyer tout si l'attribution des groupes échoue
          await adminClient.auth.admin.deleteUser(authUser.user.id);
          await adminClient.from('users').delete().eq('id', newUser.id);
          return res.status(400).json({ error: groupsError.message });
        }
      }
    }

    console.log('✅ Utilisateur créé avec succès:', newUser.id);
    res.json({ user: newUser });
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// Mise à jour d'un utilisateur
router.put('/users/:userId', checkAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    console.log('✏️ Mise à jour utilisateur:', userId);

    // Mettre à jour l'utilisateur dans la base de données
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour utilisateur:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // Si l'email a changé, mettre à jour l'email dans auth
    if (userData.email) {
      const { data: user } = await adminClient
        .from('users')
        .select('auth_id')
        .eq('id', userId)
        .single();

      if (user?.auth_id) {
        console.log('✏️ Mise à jour email auth:', userData.email);
        const { error: authError } = await adminClient.auth.admin.updateUserById(
          user.auth_id,
          { email: userData.email }
        );

        if (authError) {
          console.error('❌ Erreur mise à jour email auth:', authError);
          return res.status(400).json({ error: authError.message });
        }
      }
    }

    console.log('✅ Utilisateur mis à jour avec succès');
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
});

module.exports = router;
