import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";

// Détermine le type de compte en fonction du code
export const determineAccountType = (code: string): string => {
  // Les comptes bancaires réels sont des actifs (classe 5)
  if (code.startsWith('512') || code.startsWith('467')) {
    return 'ASSET';
  }

  // Passifs : comptes clients, fournisseurs et dettes (classes 4)
  if (
    code.startsWith('411') || // Comptes clients (pilotes)
    code.startsWith('401') || // Comptes fournisseurs
    code.startsWith('419') || // Avances clients
    code.startsWith('421') || // Personnel - rémunérations dues
    code.startsWith('431') || // Sécurité sociale
    code.startsWith('444') || // État - impôts et taxes
    code.startsWith('455') || // Associés - comptes courants
    code.startsWith('164')    // Emprunts auprès des établissements de crédit
  ) {
    return 'LIABILITY';
  }

  // Produits (classe 7 et assurances payées par les pilotes)
  if (code.startsWith('7') || code.startsWith('616')) {
    return 'REVENUE';
  }

  // Charges (classe 6, sauf assurances pilotes)
  if (code.startsWith('6') && !code.startsWith('616')) {
    return 'EXPENSE';
  }

  // Par défaut, demander une vérification manuelle
  console.warn(`Type de compte non déterminé automatiquement pour le code ${code}`);
  return 'ASSET';
};

// Transforme le code du compte pilote ou instructeur en format comptable normalisé
export const transformPilotAccountCode = (fullName: string, originalCode: string, isInstructor = false): string => {
  // Ne transformer que si c'est un compte pilote ou instructeur
  if (!fullName.startsWith('Compte pilote') && !fullName.startsWith('Compte instructeur')) {
    return originalCode;
  }

  // Extraire et nettoyer le nom complet
  const namePart = fullName
    .replace('Compte pilote ', '')
    .replace('Compte instructeur ', '')
    .trim();
  
  if (!namePart) {
    console.warn('Nom invalide:', fullName);
    return originalCode;
  }

  const names = namePart.split(' ').filter(n => n.length > 0);
  if (names.length < 2) {
    console.warn('Format de nom invalide (doit contenir prénom et nom):', fullName);
    return originalCode;
  }

  // Préfixe comptable selon le type
  const prefix = isInstructor ? "421INS" : "411PIL";

  // Cas spécial pour les noms composés (avec tiret ou plusieurs noms)
  if (names.length > 2) {
    const firstName = names[0];
    const lastName = names.slice(1).join('').toUpperCase();
    return `${prefix}${firstName[0].toUpperCase()}${lastName}`;
  }

  // Cas standard : prénom + nom
  const [firstName, lastName] = names;
  return `${prefix}${firstName[0].toUpperCase()}${lastName.toUpperCase()}`;
};

// Crée ou récupère un compte
export const getOrCreateAccount = async (
  code: string,
  name: string,
  accountType: string,
  type: string,
  clubId: string,
  userId?: string
) => {
  try {
    // Transformer le code si c'est un compte pilote
    const transformedCode = transformPilotAccountCode(name, code);
    
    // Déterminer le bon type de compte
    const correctedAccountType = determineAccountType(transformedCode);

    // Vérifier si le compte existe déjà
    const { data: existingAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('code', transformedCode)
      .eq('club_id', clubId)
      .limit(1);

    let accountId: string;

    if (existingAccounts && existingAccounts.length > 0) {
      accountId = existingAccounts[0].id;
    } else {
      // Créer le compte s'il n'existe pas
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          code: transformedCode,
          name,
          account_type: correctedAccountType,
          type,
          club_id: clubId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();

      if (error) throw error;
      accountId = newAccount.id;
    }

    // Si c'est un compte pilote et qu'on a un userId, mettre à jour la table users
    if (name.startsWith('Compte pilote') && userId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ account_id: accountId })
        .eq('id', userId);

      if (updateError) {
        console.warn(`Erreur lors de la mise à jour du account_id pour l'utilisateur ${userId}:`, updateError);
      }
    }

    return accountId;
  } catch (error) {
    throw new Error(`Erreur lors de la création du compte ${code}: ${error.message}`);
  }
};

// Crée une écriture comptable
export const createJournalEntry = async (
  date: string,
  description: string,
  clubId: string,
  lines: Array<{
    accountId: string;
    debitAmount: number;
    creditAmount: number;
  }>
) => {
  try {
    // 1. Créer l'écriture journal
    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        id: uuidv4(),
        transaction_date: date,
        description,
        club_id: clubId
      })
      .select('id')
      .single();

    if (jeError) throw jeError;

    // 2. Créer les lignes d'écriture
    const journalLines = lines.map(line => ({
      journal_entry_id: journalEntry.id,
      account_id: line.accountId,
      debit_amount: line.debitAmount,
      credit_amount: line.creditAmount
    }));

    const { error: jelError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (jelError) throw jelError;

    return journalEntry.id;
  } catch (error) {
    throw new Error(`Erreur lors de la création de l'écriture: ${error.message}`);
  }
};
