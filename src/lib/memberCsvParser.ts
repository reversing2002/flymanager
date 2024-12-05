import { format, parse } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";

// Fonction utilitaire pour parser les dates
function parseDate(dateStr: string): string | null {
  try {
    const date = parse(dateStr, "dd-MM-yyyy", new Date());
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    return null;
  }
}

export interface MemberPreview {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  licenseNumber: string;
  licenseExpiry: string;
  medicalExpiry: string;
  birthDate: string;
  address_1: string;
  city: string;
  zip_code: string;
  country: string;
  registrationDate: string;
  login: string;
  rawData: any;
}

export async function parseMembersPreview(
  csvContent: string
): Promise<MemberPreview[]> {
  const lines = csvContent.split("\n");
  const previews: MemberPreview[] = [];
  const errors: string[] = [];

  // Process all lines except header
  for (let i = 1; i < lines.length; i++) {
    try {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(";");
      if (columns.length < 5) continue;

      const preview: MemberPreview = {
        firstName: columns[2]?.trim() || "",
        lastName: columns[1]?.trim() || "",
        email: columns[43]?.trim() || "",
        phone: columns[42]?.trim() || "",
        role: determineRole(columns[44]?.trim()),
        licenseNumber: columns[25]?.trim() || "",
        licenseExpiry: parseDate(columns[31]) || "",
        medicalExpiry: parseDate(columns[33]) || "",
        birthDate: parseDate(columns[5]) || "",
        address_1: columns[35]?.trim() || "",
        city: columns[38]?.trim() || "",
        zip_code: columns[39]?.trim() || "",
        country: columns[37]?.trim() || "France",
        registrationDate: parseDate(columns[6]) || "",
        login: columns[3]?.trim().toLowerCase() || "",
        rawData: {
          first_name: columns[2]?.trim(),
          last_name: columns[1]?.trim(),
          email: columns[43]?.trim(),
          phone: columns[42]?.trim(),
          role: determineRole(columns[44]?.trim()),
          license_number: columns[25]?.trim(),
          license_expiry: parseDate(columns[31]),
          medical_expiry: parseDate(columns[33]),
          birth_date: parseDate(columns[5]),
          address_1: columns[35]?.trim(),
          city: columns[38]?.trim(),
          zip_code: columns[39]?.trim(),
          country: columns[37]?.trim(),
          registration_date: parseDate(columns[6]),
          login: columns[3]?.trim().toLowerCase(),
          password: uuidv4().slice(0, 8),
        },
      };

      previews.push(preview);
    } catch (error) {
      errors.push(
        `Ligne ${i + 1}: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Erreurs de parsing:\n${errors.join("\n")}`);
  }

  return previews;
}

export async function importMembers(members: MemberPreview[]): Promise<void> {
  for (const member of members) {
    const { rawData } = member;

    try {
      await supabase.from("users").insert({
        id: uuidv4(),
        ...rawData,
      });
    } catch (error) {
      console.error("Error importing member:", error);
      throw error;
    }
  }
}

// Fonction utilitaire pour déterminer le rôle
function determineRole(role: string): string {
  switch (role?.toLowerCase()) {
    case "instructeur":
      return "INSTRUCTOR";
    case "administrateur":
      return "ADMIN";
    case "mécanicien":
      return "MECHANIC";
    case "pilote":
    default:
      return "PILOT";
  }
}

// Fonction utilitaire pour déterminer le numéro de licence
function determineLicenseNumber(columns: string[]): string {
  // Combine les différents numéros de licence possibles
  const licenses = [
    columns[25]?.trim(), // Numéro licence avion
    columns[26]?.trim(), // Numéro licence ULM
    columns[27]?.trim(), // Numéro licence ballon
    columns[28]?.trim(), // Numéro licence hélicoptère
    columns[29]?.trim(), // BB License Number
  ];

  return licenses.find((l) => l && l.length > 0) || "";
}
