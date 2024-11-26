import { supabase } from "../supabase";
import type { User } from "../../types/database";

export async function updateUser(
  data: Partial<User> & { id: string }
): Promise<void> {
  try {
    console.log("Updating user with data:", data);

    // Update user data in the public.users table
    const { error: userError } = await supabase
      .from("users")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        gender: data.gender,
        birth_date: data.birthDate,
        image_url: data.imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (userError) {
      console.error("Error updating user:", userError);
      throw userError;
    }

    console.log("User update completed successfully");
  } catch (error) {
    console.error("Error in updateUser:", error);
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    console.log("Getting user by ID:", id);

    const { data, error } = await supabase
      .from("users")
      .select(
        `
        *,
        medical_certifications (
          id,
          class,
          valid_from,
          valid_until,
          document_url
        ),
        pilot_licenses (
          id,
          type,
          number,
          valid_until,
          document_url
        ),
        pilot_qualifications (
          id,
          code,
          name,
          has_qualification
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      throw error;
    }

    if (!data) {
      console.log("No user found with ID:", id);
      return null;
    }

    console.log("User data retrieved:", data);

    // Get the latest valid medical certification
    const latestMedical = data.medical_certifications?.sort(
      (a, b) =>
        new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime()
    )[0];

    // Get the latest license
    const latestLicense = data.pilot_licenses?.sort(
      (a, b) =>
        new Date(b.valid_until || "").getTime() -
        new Date(a.valid_until || "").getTime()
    )[0];

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      gender: data.gender,
      birthDate: data.birth_date,
      imageUrl: data.image_url,
      medicalCertification: latestMedical,
      license: latestLicense,
      qualifications: data.pilot_qualifications || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error("Error in getUserById:", error);
    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("*");

  if (error) throw error;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
  };

  return data.map((user) => ({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: formatDate(user.birth_date),
    imageUrl: user.image_url,
    defaultSchedule: user.default_schedule,
    role: user.role,
    membershipExpiry: formatDate(user.membership_expiry),
    login: user.login,
    password: user.password,
    balance: user.balance,
    isInstructor: user.role === "INSTRUCTOR",
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));
}
