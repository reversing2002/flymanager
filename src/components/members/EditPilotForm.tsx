import React, { useState, useEffect } from "react";
import { AlertTriangle, Upload, X, Check } from "lucide-react";
import type { User } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { SYSTEM_ROLE_GROUPS, UserGroup } from "../../types/roles";
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { getInitials } from "../../lib/utils/avatarUtils";
import * as Checkbox from "@radix-ui/react-checkbox";
import "../../styles/checkbox.css";
import { Button } from "@mui/material";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Typography from '@mui/material/Typography';
import PilotFlightStats from './PilotFlightStats';

interface EditPilotFormProps {
  pilot: User;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
  currentUser?: User;
  availableRoles?: UserGroup[];
}

const EditPilotForm: React.FC<EditPilotFormProps> = ({
  pilot,
  onSubmit,
  onCancel,
  isAdmin = false,
  currentUser,
  availableRoles = [],
}) => {
  console.log('[EditPilotForm] Initialisation avec:', {
    pilotId: pilot.id,
    pilotClubId: pilot.club?.id,
    currentUserClubId: currentUser?.club?.id,
    availableRoles
  });
  
  const [formData, setFormData] = useState({
    first_name: pilot.first_name || "",
    last_name: pilot.last_name || "",
    email: pilot.email || "",
    phone: pilot.phone || "",
    gender: pilot.gender || "",
    birth_date: pilot.birth_date || "",
    roles: [] as string[],
    image_url: pilot.image_url || "",
    instructor_rate: pilot.instructor_rate || null,
    instructor_fee: pilot.instructor_fee || null,
    password: "",
    confirmPassword: "",
    calendars: [] as { id: string, name: string }[],
    smile_login: pilot.smile_login || "",
    smile_password: pilot.smile_password || "",
    last_smile_sync: pilot.last_smile_sync || null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [newCalendar, setNewCalendar] = useState({ id: "", name: "" });
  const [calendarUrl, setCalendarUrl] = useState<string>("");

  useEffect(() => {
    const loadUserData = async () => {
      console.log('[EditPilotForm] useEffect déclenché avec pilot.id:', pilot.id);
      
      if (!pilot.id) {
        console.log('[EditPilotForm] Pas de pilot.id, sortie de loadUserData');
        return;
      }

      try {
        // Charger les groupes de l'utilisateur avec une jointure sur user_groups
        console.log('[EditPilotForm] Chargement des groupes pour pilot.id:', pilot.id);
        const { data: groupData, error: groupError } = await supabase
          .from('user_group_memberships')
          .select(`
            user_groups:group_id (
              code
            )
          `)
          .eq('user_id', pilot.id);

        if (groupError) {
          console.error('[EditPilotForm] Erreur lors du chargement des groupes:', groupError);
          throw groupError;
        }

        console.log('[EditPilotForm] Groupes reçus:', groupData);
        
        // Extraire les codes des groupes
        const groups = groupData
          .map(g => g.user_groups?.code)
          .filter(Boolean) as string[];
        
        console.log('[EditPilotForm] Groupes normalisés:', groups);

        // Mettre à jour les rôles dans le formulaire
        setFormData(prev => ({
          ...prev,
          roles: groups
        }));
        
        console.log('[EditPilotForm] Mise à jour des rôles sans calendriers:', groups);
      } catch (err) {
        console.error('[EditPilotForm] Erreur lors du chargement des données:', err);
        toast.error("Erreur lors du chargement des données");
      }
    };

    loadUserData();
  }, [pilot.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Gestion spéciale pour les champs numériques
    if (name === 'instructor_rate' || name === 'instructor_fee') {
      const numericValue = value === '' ? null : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleChange = (role: string) => {
    const normalizedRole = role.toUpperCase();
    console.log("[EditPilotForm] Role change triggered for:", normalizedRole);
    console.log("[EditPilotForm] Current roles:", formData.roles);
    
    setFormData((prev) => {
      const newRoles = prev.roles.includes(normalizedRole)
        ? prev.roles.filter((r) => r !== normalizedRole)
        : [...prev.roles, normalizedRole];
      console.log("[EditPilotForm] Updated roles:", newRoles);
      return { ...prev, roles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = { ...formData };
      dataToSubmit.roles = formData.roles.map(role => role.toUpperCase());

      // Mise à jour du mot de passe si nécessaire
      if (formData.password || formData.confirmPassword) {
        if (formData.password !== formData.confirmPassword) {
          setError("Les mots de passe ne correspondent pas");
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError("Le mot de passe doit contenir au moins 6 caractères");
          setLoading(false);
          return;
        }

        // Si c'est un admin qui modifie le mot de passe d'un autre utilisateur
        if (isAdmin && currentUser?.id !== pilot.id) {
          dataToSubmit.password = formData.password;
        } else {
          // Si l'utilisateur modifie son propre mot de passe
          const { error: passwordError } = await supabase.auth.updateUser({
            password: formData.password
          });
          if (passwordError) throw passwordError;
        }
      }

      // Mise à jour des calendriers si c'est un instructeur
      if (dataToSubmit.roles.includes('INSTRUCTOR')) {
        // D'abord, supprimer les anciennes entrées
        const { error: deleteError } = await supabase
          .from('instructor_calendars')
          .delete()
          .eq('instructor_id', pilot.id);

        if (deleteError) throw deleteError;

        // Ensuite, insérer les nouvelles entrées
        if (formData.calendars.length > 0) {
          const { error: calendarError } = await supabase
            .from('instructor_calendars')
            .insert(
              formData.calendars.map(cal => ({
                instructor_id: pilot.id,
                calendar_id: cal.id,
                calendar_name: cal.name
              }))
            );

          if (calendarError) throw calendarError;
        }
      }

      await onSubmit(dataToSubmit);

      if (isAdmin) {
        const { error: groupsError } = await supabase
          .rpc('update_user_groups', {
            p_user_id: pilot.id,
            p_groups: dataToSubmit.roles
          });

        if (groupsError) throw groupsError;
      }

      toast.success("Profil mis à jour avec succès");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Erreur lors de la mise à jour du profil");
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${pilot.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Erreur lors du téléchargement de l'image");
    }
  };

  const isInstructor = formData.roles.includes("INSTRUCTOR");

  const getCalendarUrl = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/instructor-calendar/get-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: pilot.id }),
      });
      
      const data = await response.json();
      if (data.success) {
        setCalendarUrl(data.calendar_url);
        toast.success("URL du calendrier générée avec succès");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'URL du calendrier:", error);
      toast.error("Erreur lors de la récupération de l'URL du calendrier");
    }
  };

  return (
    <div>
      {/* Formulaire principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <div className="relative">
              {formData.image_url ? (
                <img
                  src={formData.image_url}
                  alt={`${formData.first_name} ${formData.last_name}`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-xl font-medium text-white">
                  {getInitials(formData.first_name, formData.last_name)}
                </div>
              )}
              <label
                htmlFor="photo"
                className="absolute bottom-0 right-0 p-1 bg-slate-800 rounded-full cursor-pointer hover:bg-slate-700"
              >
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  id="photo"
                  name="photo"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Rôles
                </label>
                <div className="space-y-2">
                  {availableRoles.map((group) => (
                    <div key={group.code} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`role-${group.code}`}
                        checked={formData.roles.includes(group.code.toUpperCase())}
                        onChange={() => handleRoleChange(group.code)}
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`role-${group.code}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        {group.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.roles.includes("INSTRUCTOR") && (
              <>
                <div>
                  <label htmlFor="instructor_rate" className="block text-sm font-medium text-gray-700">
                    Tarif horaire d'instruction
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="instructor_rate"
                      id="instructor_rate"
                      value={formData.instructor_rate ?? ''}
                      onChange={handleChange}
                      className="focus:ring-sky-500 focus:border-sky-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">/heure</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="instructor_fee" className="block text-sm font-medium text-gray-700">
                    Rémunération horaire instructeur
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="instructor_fee"
                      id="instructor_fee"
                      value={formData.instructor_fee ?? ''}
                      onChange={handleChange}
                      className="focus:ring-sky-500 focus:border-sky-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">/heure</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Section Calendriers Google (visible uniquement pour les instructeurs) */}
            {formData.roles.includes('INSTRUCTOR') && (
              <div className="col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Calendriers Google
                </h3>
                <div className="space-y-4">
                  {formData.calendars.map((calendar, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <input
                        type="text"
                        value={calendar.name}
                        onChange={(e) => {
                          const newCalendars = [...formData.calendars];
                          newCalendars[index].name = e.target.value;
                          setFormData(prev => ({ ...prev, calendars: newCalendars }));
                        }}
                        placeholder="Nom du calendrier"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={calendar.id}
                        onChange={(e) => {
                          const newCalendars = [...formData.calendars];
                          newCalendars[index].id = e.target.value;
                          setFormData(prev => ({ ...prev, calendars: newCalendars }));
                        }}
                        placeholder="ID du calendrier Google"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newCalendars = formData.calendars.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, calendars: newCalendars }));
                        }}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        calendars: [...prev.calendars, { id: "", name: "" }]
                      }));
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Ajouter un calendrier Google pour mes indisponibilités
                  </button>
                  <button
                    type="button"
                    onClick={getCalendarUrl}
                    className="inline-flex items-center ml-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <CalendarMonthIcon className="h-5 w-5 mr-2" />
                    Synchroniser mon calendrier
                  </button>
                </div>
                {calendarUrl && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-600">
                      Pour voir vos réservations dans Google Agenda, copiez cette URL et ajoutez-la dans les paramètres de votre agenda Google :
                    </p>
                    <input
                      type="text"
                      value={calendarUrl}
                      readOnly
                      className="w-full p-2 border rounded-md bg-gray-50"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section SMILE */}
            <div className="space-y-4 mt-6">
              <Typography variant="h6">Synchronisation SMILE</Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="smile_login" className="block text-sm font-medium text-gray-700">
                    Identifiant SMILE
                  </label>
                  <input
                    type="text"
                    id="smile_login"
                    name="smile_login"
                    value={formData.smile_login}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="smile_password" className="block text-sm font-medium text-gray-700">
                    Mot de passe SMILE
                  </label>
                  <input
                    type="password"
                    id="smile_password"
                    name="smile_password"
                    value={formData.smile_password}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              {formData.last_smile_sync && (
                <Typography variant="body2" className="text-gray-500">
                  Dernière synchronisation : {new Date(formData.last_smile_sync).toLocaleString()}
                </Typography>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Genre
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              >
                <option value="">Sélectionner</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Section mot de passe */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium mb-4">Changer le mot de passe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>

      {/* Statistiques de vol */}
      <PilotFlightStats 
        userId={pilot.id} 
        isInstructor={formData.roles.includes("INSTRUCTOR")} 
      />
    </div>
  );
};

export default EditPilotForm;