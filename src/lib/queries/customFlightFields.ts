import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { CustomFieldDefinition, CustomFlightFieldValue } from "../../types/customFields";
import { toast } from "react-hot-toast";

export const useCustomFlightFields = (clubId?: string) => {
  return useQuery({
    queryKey: ["customFlightFields", clubId],
    queryFn: async () => {
      if (!clubId) {
        console.log("useCustomFlightFields: Pas de clubId fourni");
        return [];
      }
      console.log("useCustomFlightFields: Recherche des champs pour le club", clubId);
      const { data, error } = await supabase
        .from("custom_flight_field_definitions")
        .select("*")
        .order("display_order");

      if (error) {
        console.error("useCustomFlightFields: Erreur", error);
        throw error;
      }
      console.log("useCustomFlightFields: Champs trouvés", data);
      return data as CustomFieldDefinition[];
    },
    enabled: !!clubId,
  });
};

export const useCustomFlightFieldValues = (flightId?: string) => {
  return useQuery({
    queryKey: ["customFlightFieldValues", flightId],
    queryFn: async () => {
      if (!flightId) return [];
      const { data, error } = await supabase
        .from("custom_flight_field_values")
        .select("*")
        .eq("flight_id", flightId);

      if (error) throw error;
      return data as CustomFlightFieldValue[];
    },
    enabled: !!flightId,
  });
};

export const useCreateCustomFlightField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Partial<CustomFieldDefinition>) => {
      const { data, error } = await supabase
        .from("custom_flight_field_definitions")
        .insert([field])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["customFlightFields", variables.club_id]);
      toast.success("Champ personnalisé créé avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la création du champ personnalisé:", error);
      toast.error("Erreur lors de la création du champ personnalisé");
    },
  });
};

export const useUpdateCustomFlightField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...field
    }: Partial<CustomFieldDefinition> & { id: string }) => {
      const { data, error } = await supabase
        .from("custom_flight_field_definitions")
        .update(field)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["customFlightFields", variables.club_id]);
      toast.success("Champ personnalisé mis à jour avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour du champ personnalisé:", error);
      toast.error("Erreur lors de la mise à jour du champ personnalisé");
    },
  });
};

export const useDeleteCustomFlightField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_flight_field_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, __, { club_id }) => {
      queryClient.invalidateQueries(["customFlightFields", club_id]);
      toast.success("Champ personnalisé supprimé avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression du champ personnalisé:", error);
      toast.error("Erreur lors de la suppression du champ personnalisé");
    },
  });
};

export const useUpdateCustomFlightFieldValues = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flightId,
      values,
    }: {
      flightId: string;
      values: Partial<CustomFlightFieldValue>[];
    }) => {
      // Supprimer d'abord toutes les valeurs existantes
      const { error: deleteError } = await supabase
        .from("custom_flight_field_values")
        .delete()
        .eq("flight_id", flightId);

      if (deleteError) throw deleteError;

      // Insérer les nouvelles valeurs
      if (values.length > 0) {
        const { error: insertError } = await supabase
          .from("custom_flight_field_values")
          .insert(
            values.map((value) => ({
              ...value,
              flight_id: flightId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["customFlightFieldValues", variables.flightId]);
      toast.success("Champs personnalisés mis à jour avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour des champs personnalisés:", error);
      toast.error("Erreur lors de la mise à jour des champs personnalisés");
    },
  });
};

export const useCreateCustomFlightFieldValues = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flightId,
      values,
    }: {
      flightId: string;
      values: Partial<CustomFlightFieldValue>[];
    }) => {
      if (values.length === 0) return;

      const { error } = await supabase
        .from("custom_flight_field_values")
        .insert(
          values.map((value) => ({
            ...value,
            flight_id: flightId,
          }))
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["customFlightFieldValues", variables.flightId]);
      toast.success("Champs personnalisés créés avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la création des champs personnalisés:", error);
      toast.error("Erreur lors de la création des champs personnalisés");
    },
  });
};
