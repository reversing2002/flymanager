import { supabase } from "../supabase";
import type { Flight } from "../../types/database";
import { v4 as uuidv4 } from "uuid";

export async function getFlights(): Promise<Flight[]> {
  const { data, error } = await supabase.from("flights").select(`
      *,
      flight_type:flight_type_id (
        name,
        accounting_category
      )
    `);

  if (error) throw error;
  return data.map((flight) => ({
    id: flight.id,
    reservationId: flight.reservation_id,
    userId: flight.user_id,
    aircraftId: flight.aircraft_id,
    flightTypeId: flight.flight_type_id,
    instructorId: flight.instructor_id,
    date: flight.date,
    duration: flight.duration,
    destination: flight.destination,
    hourlyRate: flight.hourly_rate,
    cost: flight.cost,
    paymentMethod: flight.payment_method,
    isValidated: flight.is_validated,
    accountingCategory: flight.flight_type?.accounting_category || "REGULAR",
    createdAt: flight.created_at,
    updatedAt: flight.updated_at,
  }));
}

export async function createFlight(data: Partial<Flight>): Promise<void> {
  try {
    console.log("Creating flight with data:", data);

    // Vérifier l'état de maintenance de l'appareil
    const { data: aircraft, error: aircraftError } = await supabase
      .from("aircraft")
      .select(
        "total_flight_hours, hours_before_maintenance, next_maintenance_date, status"
      )
      .eq("id", data.aircraftId)
      .single();

    if (aircraftError) throw aircraftError;

    // Vérifier si l'appareil est disponible
    if (aircraft.status !== "AVAILABLE") {
      throw new Error("L'appareil n'est pas disponible pour le vol");
    }

    // Calculer les nouvelles heures
    const flightHours = data.duration / 60;
    const newTotalHours = Number(
      (aircraft.total_flight_hours + flightHours).toFixed(1)
    );
    const newHoursBeforeMaintenance = Number(
      (aircraft.hours_before_maintenance - flightHours).toFixed(1)
    );

    // Vérifier si le vol dépasserait les limites de maintenance
    if (newHoursBeforeMaintenance < 0) {
      throw new Error(
        "Ce vol dépasserait le potentiel restant avant maintenance"
      );
    }

    // Vérifier la date de maintenance
    const nextMaintenanceDate = new Date(aircraft.next_maintenance_date);
    const flightDate = new Date(data.date);
    if (flightDate > nextMaintenanceDate) {
      throw new Error("La date de maintenance est dépassée");
    }

    // Génrer un nouvel UUID si non fourni
    const flightId = data.id || uuidv4();
    console.log("Generated flight ID:", flightId);

    // Préparer les données du vol
    const flightData = {
      id: flightId,
      reservation_id: data.reservationId || null,
      user_id: data.userId,
      aircraft_id: data.aircraftId,
      flight_type_id: data.flightTypeId,
      instructor_id:
        data.instructorId && data.instructorId.trim() !== ""
          ? data.instructorId
          : null,
      date: data.date,
      duration: data.duration,
      destination: data.destination || null,
      hourly_rate: data.hourlyRate,
      cost: data.cost,
      payment_method: data.paymentMethod,
      is_validated: data.isValidated || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Prepared flight data:", flightData);

    // Générer la description et logger le résultat
    console.log("Calling generateFlightDescription...");
    const description = await generateFlightDescription(data);
    console.log("Generated description:", description);

    // Créer l'entrée comptable associée
    const accountEntry = {
      id: uuidv4(),
      user_id: data.userId,
      date: data.date,
      type: "FLIGHT",
      amount: -Math.abs(data.cost || 0),
      payment_method: data.paymentMethod,
      description: description,
      is_validated: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Prepared account entry:", accountEntry);

    // Utiliser une transaction pour créer le vol, l'entrée comptable et mettre à jour l'appareil
    const { error: transactionError } = await supabase.rpc(
      "create_flight_with_account_and_update",
      {
        flight_data: flightData,
        account_data: accountEntry,
        new_total_hours: newTotalHours,
        new_hours_before_maintenance: newHoursBeforeMaintenance,
      }
    );

    if (transactionError) {
      console.error("Transaction error:", transactionError);
      throw transactionError;
    }

    console.log("Flight created successfully");

    // Vérifier si la maintenance devient urgente
    if (newHoursBeforeMaintenance <= 5) {
      // Envoyer une notification ou une alerte
      await supabase.rpc("send_maintenance_alert", {
        aircraft_id: data.aircraftId,
        remaining_hours: newHoursBeforeMaintenance,
      });
    }
  } catch (error) {
    console.error("Error in createFlight:", error);
    throw error;
  }
}

async function generateFlightDescription(data: any) {
  console.log("Starting generateFlightDescription with data:", data);
  try {
    // Récupérer les informations de l'avion et du pilote
    const { data: aircraft, error: aircraftError } = await supabase
      .from("aircraft")
      .select("registration")
      .eq("id", data.aircraftId)
      .single();

    if (aircraftError) {
      console.error("Error fetching aircraft:", aircraftError);
      throw aircraftError;
    }
    console.log("Retrieved aircraft:", aircraft);

    const { data: pilot, error: pilotError } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", data.userId)
      .single();

    if (pilotError) {
      console.error("Error fetching pilot:", pilotError);
      throw pilotError;
    }
    console.log("Retrieved pilot:", pilot);

    const { data: flightType, error: flightTypeError } = await supabase
      .from("flight_types")
      .select("name")
      .eq("id", data.flightTypeId)
      .single();

    if (flightTypeError) {
      console.error("Error fetching flight type:", flightTypeError);
      throw flightTypeError;
    }
    console.log("Retrieved flight type:", flightType);

    const formattedDate = new Date(data.date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    console.log("Formatted date:", formattedDate);

    const duration = `${Math.floor(data.duration / 60)}h${String(
      data.duration % 60
    ).padStart(2, "0")}`;
    console.log("Formatted duration:", duration);

    const pilotName = pilot
      ? `${pilot.first_name} ${pilot.last_name}`
      : "Pilote inconnu";
    console.log("Pilot name:", pilotName);

    const description = `${flightType?.name || "Vol"} - ${pilotName} - ${
      aircraft?.registration || ""
    } (${duration}) - ${formattedDate}${
      data.destination ? ` - ${data.destination}` : ""
    }`;

    console.log("Final generated description:", description);
    return description;
  } catch (error) {
    console.error("Error in generateFlightDescription:", error);
    // Fallback en cas d'erreur
    const fallbackDescription = `Vol du ${new Date(
      data.date
    ).toLocaleDateString("fr-FR")} - ${data.duration} minutes`;
    console.log("Using fallback description:", fallbackDescription);
    return fallbackDescription;
  }
}

export async function updateFlight(
  id: string,
  data: Partial<Flight>
): Promise<void> {
  try {
    // Si la durée est modifiée, recalculer les heures de l'appareil
    if (data.duration) {
      const { data: oldFlight } = await supabase
        .from("flights")
        .select("duration, aircraft_id")
        .eq("id", id)
        .single();

      if (oldFlight) {
        const hoursDifference = (data.duration - oldFlight.duration) / 60;

        // Mettre à jour les heures de l'appareil
        const { data: aircraft } = await supabase
          .from("aircraft")
          .select("total_flight_hours, hours_before_maintenance")
          .eq("id", oldFlight.aircraft_id)
          .single();

        if (aircraft) {
          const newTotalHours = Number(
            (aircraft.total_flight_hours + hoursDifference).toFixed(1)
          );
          const newHoursBeforeMaintenance = Number(
            (aircraft.hours_before_maintenance - hoursDifference).toFixed(1)
          );

          if (newHoursBeforeMaintenance < 0) {
            throw new Error(
              "La modification dépasserait le potentiel restant avant maintenance"
            );
          }

          await supabase
            .from("aircraft")
            .update({
              total_flight_hours: newTotalHours,
              hours_before_maintenance: newHoursBeforeMaintenance,
            })
            .eq("id", oldFlight.aircraft_id);
        }
      }
    }

    // Mettre à jour le vol
    const { error } = await supabase
      .from("flights")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating flight:", error);
    throw error;
  }
}

export async function deleteFlight(id: string): Promise<void> {
  try {
    // Récupérer les informations du vol avant suppression
    const { data: flight } = await supabase
      .from("flights")
      .select("duration, aircraft_id")
      .eq("id", id)
      .single();

    if (flight) {
      // Recalculer les heures de l'appareil
      const flightHours = flight.duration / 60;

      const { data: aircraft } = await supabase
        .from("aircraft")
        .select("total_flight_hours, hours_before_maintenance")
        .eq("id", flight.aircraft_id)
        .single();

      if (aircraft) {
        const newTotalHours = Number(
          (aircraft.total_flight_hours - flightHours).toFixed(1)
        );
        const newHoursBeforeMaintenance = Number(
          (aircraft.hours_before_maintenance + flightHours).toFixed(1)
        );

        // Utiliser une transaction pour la suppression et la mise à jour
        const { error } = await supabase.rpc("delete_flight_and_update_hours", {
          flight_id: id,
          new_total_hours: newTotalHours,
          new_hours_before_maintenance: newHoursBeforeMaintenance,
          aircraft_id: flight.aircraft_id,
        });

        if (error) throw error;
      }
    }
  } catch (error) {
    console.error("Error deleting flight:", error);
    throw error;
  }
}
