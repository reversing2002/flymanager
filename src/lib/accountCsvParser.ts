import { format, parse } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";

// Fonction utilitaire pour parser les dates
function parseDate(dateStr: string): string | null {
  try {
    const date = parse(dateStr, "dd-MM-yyyy", new Date());
    return format(date, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

// Fonction pour nettoyer et convertir les montants
function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(",", ".")) || 0;
}

// Types d'opérations autorisés dans la base de données
type AccountEntryType =
  | "SUBSCRIPTION" // Cotisation
  | "MEMBERSHIP" // Adhésion
  | "FLIGHT" // Vol
  | "INSTRUCTION" // Instruction
  | "FUEL" // Essence
  | "MAINTENANCE" // Maintenance
  | "INSURANCE" // Assurance
  | "FFA" // FFA
  | "ACCOUNT_FUNDING" // Approvisionnement compte
  | "OTHER"; // Autre

// Fonction pour déterminer le type d'opération
function determineType(description: string): AccountEntryType {
  const desc = description.toLowerCase();

  if (desc.includes("vol du")) return "FLIGHT";
  if (desc.includes("cotisation")) return "SUBSCRIPTION";
  if (desc.includes("adhésion")) return "MEMBERSHIP";
  if (desc.includes("instruction")) return "INSTRUCTION";
  if (desc.includes("essence")) return "FUEL";
  if (desc.includes("maintenance")) return "MAINTENANCE";
  if (desc.includes("appro compte")) return "ACCOUNT_FUNDING";
  if (desc.includes("virement")) return "ACCOUNT_FUNDING";
  if (desc.includes("assurance")) return "INSURANCE";
  if (desc.includes("ffa")) return "FFA";

  // Cas spéciaux
  if (desc.includes("casse")) return "INSURANCE";
  if (desc.includes("manuel pilote")) return "OTHER";
  if (desc.includes("droit d'entrée")) return "MEMBERSHIP";

  return "OTHER";
}

// Fonction pour normaliser les méthodes de paiement
function normalizePaymentMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "COMPTE":
      return "ACCOUNT";
    case "CARTE BANCAIRE":
    case "CARTE":
      return "CARD";
    case "ESPECE":
    case "ESPÈCE":
    case "ESPECES":
    case "ESPÈCES":
      return "CASH";
    case "VIREMENT":
    case "NON":
      return "TRANSFER";
    case "CHEQUE":
    case "CHÈQUE":
      return "CHECK";
    default:
      return "TRANSFER"; // Valeur par défaut
  }
}

export interface AccountPreview {
  date: string;
  userName: string;
  amount: number;
  paymentMethod: string;
  description: string;
  balance: number;
  previousBalance: number;
  type: string;
  rawData: any;
}

// Fonction pour normaliser les noms (retire les accents et met en majuscules)
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

// Fonction pour trouver un utilisateur par son nom de famille uniquement
async function findUser(lastName: string, users: any[]): Promise<any> {
  const normalizedLastName = normalizeName(lastName);

  // Recherche par nom de famille uniquement
  const user = users.find(
    (u) => normalizeName(u.last_name) === normalizedLastName
  );

  if (!user) {
    console.warn(`⚠️ Utilisateur non trouvé avec le nom: ${lastName}`);
    console.warn(`Nom normalisé recherché: ${normalizedLastName}`);
  }

  return user;
}

// Fonction pour parser les données (preview ou import complet)
export async function parseAccountData(
  csvContent: string,
  previewOnly: boolean = false
): Promise<AccountPreview[]> {
  const lines = csvContent.split("\n");
  const previews: AccountPreview[] = [];

  // Récupérer tous les utilisateurs
  const { data: users } = await supabase
    .from("users")
    .select("id, first_name, last_name");

  // Récupérer l'utilisateur connecté via la session Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Utilisateur non connecté");

  const connectedUserId = session.user.id;

  if (!users) {
    throw new Error("Impossible de récupérer la liste des utilisateurs");
  }

  const maxLines = previewOnly ? Math.min(11, lines.length) : lines.length;

  for (let i = 1; i < maxLines; i++) {
    try {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(";");
      if (columns.length < 8) continue;

      const lastName = columns[2]?.trim() || "";
      const firstName = columns[3]?.trim() || "";
      const userName = `${firstName} ${lastName}`.trim();

      // Cas spéciaux
      if (userName === "Vol Découverte" || userName === "Convoyage") {
        const systemUserId = await getOrCreateSystemUser(userName);
        continue;
      }

      // Trouver l'utilisateur par nom de famille uniquement
      const assignedUser = await findUser(lastName, users);

      if (!assignedUser) {
        console.warn(`Ligne ${i}: ${line}`);
        continue;
      }

      const preview: AccountPreview = {
        date: parseDate(columns[1]) || "",
        userName,
        amount: parseAmount(columns[4]),
        paymentMethod: normalizePaymentMethod(columns[7]?.trim() || ""),
        description: columns[8]?.trim() || "",
        balance: parseAmount(columns[5]),
        previousBalance: parseAmount(columns[6]),
        type: determineType(columns[8] || ""),
        rawData: {
          user_id: connectedUserId, // ID de l'utilisateur connecté via Supabase
          assigned_to_id: assignedUser.id, // ID du membre trouvé dans le CSV
          date: parseDate(columns[1]),
          type: determineType(columns[8] || ""),
          amount: parseAmount(columns[4]),
          payment_method: normalizePaymentMethod(columns[7]?.trim() || ""),
          description: columns[8]?.trim(),
          is_validated: false,
        },
      };

      previews.push(preview);
    } catch (error) {
      console.error(`Erreur ligne ${i}:`, error);
    }
  }

  return previews;
}

// Fonction pour l'aperçu (10 premières lignes)
export async function parseAccountsPreview(
  csvContent: string
): Promise<AccountPreview[]> {
  return parseAccountData(csvContent, true);
}

// Fonction pour l'import complet
export async function importAccounts(
  accounts: AccountPreview[]
): Promise<void> {
  for (const account of accounts) {
    try {
      await supabase.from("account_entries").insert({
        id: uuidv4(),
        ...account.rawData,
      });
    } catch (error) {
      console.error("Error importing account entry:", error);
      throw error;
    }
  }
}

// Fonction pour parser toutes les données
export async function parseAllAccounts(
  csvContent: string
): Promise<AccountPreview[]> {
  return parseAccountData(csvContent, false);
}

// Fonction pour gérer les utilisateurs système
async function getOrCreateSystemUser(userName: string): Promise<string> {
  if (userName === "Vol Découverte") {
    return await getOrCreateUser(
      "VOL DECOUVERTE",
      "Vol",
      "Découverte",
      "SYSTEM"
    );
  }
  if (userName === "Convoyage") {
    return await getOrCreateUser("CONVOYAGE", "Convoyage", "", "SYSTEM");
  }
  throw new Error(`Utilisateur non trouvé: ${userName}`);
}

async function getOrCreateUser(
  login: string,
  firstName: string,
  lastName: string,
  role: string
): Promise<string> {
  // Vérifier si l'utilisateur existe déjà
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("login", login)
    .single();

  if (existingUser) {
    return existingUser.id;
  }

  // Créer l'utilisateur s'il n'existe pas
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      login,
      first_name: firstName,
      last_name: lastName,
      role,
    })
    .select("id")
    .single();

  if (error) throw error;
  return newUser.id;
}

// Mettre à jour le composant d'affichage aussi
const getTypeLabel = (type: AccountEntryType): string => {
  switch (type) {
    case "FLIGHT":
      return "Vol";
    case "SUBSCRIPTION":
      return "Cotisation";
    case "MEMBERSHIP":
      return "Adhésion";
    case "INSTRUCTION":
      return "Instruction";
    case "FUEL":
      return "Essence";
    case "MAINTENANCE":
      return "Maintenance";
    case "INSURANCE":
      return "Assurance";
    case "FFA":
      return "FFA";
    case "ACCOUNT_FUNDING":
      return "Approvisionnement";
    case "OTHER":
      return "Autre";
    default:
      return type;
  }
};
