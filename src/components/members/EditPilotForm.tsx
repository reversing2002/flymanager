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
import { Button, Card, CardContent, Grid, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Divider, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ImportCalendarIcon from '@mui/icons-material/CalendarToday';
import IosShareIcon from '@mui/icons-material/IosShare';
import Typography from '@mui/material/Typography';
import PilotFlightStats from './PilotFlightStats';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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

  const [existingCalendars, setExistingCalendars] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    const loadUserData = async () => {
      console.log('[EditPilotForm] useEffect déclenché avec pilot.id:', pilot.id);
      
      if (!pilot.id) {
        console.log('[EditPilotForm] Pas de pilot.id, sortie de loadUserData');
        return;
      }

      try {
        // Charger les groupes de l'utilisateur
        const { data: groupData, error: groupError } = await supabase
          .from('user_group_memberships')
          .select(`
            user_groups:group_id (
              code
            )
          `)
          .eq('user_id', pilot.id);

        if (groupError) throw groupError;

        const groups = groupData
          .map(g => g.user_groups?.code)
          .filter(Boolean) as string[];

        // Charger les calendriers existants
        const { data: calendarData, error: calendarError } = await supabase
          .from('instructor_calendars')
          .select('calendar_id, calendar_name')
          .eq('instructor_id', pilot.id);

        if (calendarError) throw calendarError;

        const calendars = calendarData.map(cal => ({
          id: cal.calendar_id,
          name: cal.calendar_name
        }));

        setExistingCalendars(calendars);
        setFormData(prev => ({
          ...prev,
          roles: groups,
          calendars: calendars
        }));
        
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

  const handleAddCalendar = () => {
    if (!newCalendar.id || !newCalendar.name) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setFormData(prev => ({
      ...prev,
      calendars: [...prev.calendars, newCalendar]
    }));
    setExistingCalendars(prev => [...prev, newCalendar]);
    setNewCalendar({ id: "", name: "" });
    setShowCalendarModal(false);
    toast.success("Calendrier ajouté avec succès");
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
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Typography variant="h5" component="h2" className="mb-6 text-gray-800 font-semibold">
            Modifier le profil
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prénom"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                variant="outlined"
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Téléphone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Genre</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  label="Genre"
                >
                  <MenuItem value="">Sélectionner</MenuItem>
                  <MenuItem value="M">Homme</MenuItem>
                  <MenuItem value="F">Femme</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de naissance"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleChange}
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider className="my-6" />

          <Typography variant="h6" className="mb-4 text-gray-700">
            Rôles et permissions
          </Typography>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {availableRoles
              .filter(role => {
                // Si l'utilisateur est un superadmin, on montre tous les rôles
                if (currentUser?.roles?.includes('SYSTEM_ADMIN')) {
                  return true;
                }
                // Sinon on cache le rôle SYSTEM_ADMIN
                return role.code.toUpperCase() !== 'SYSTEM_ADMIN';
              })
              .map((role) => (
                <FormControlLabel
                  key={role.code}
                  control={
                    <Checkbox.Root
                      className="checkbox-root"
                      checked={formData.roles.includes(role.code)}
                      onCheckedChange={() => handleRoleChange(role.code)}
                    >
                      <Checkbox.Indicator className="checkbox-indicator">
                        <Check className="w-4 h-4" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                  }
                  label={getRoleLabel(role.code)}
                  className="flex items-center space-x-2"
                />
              ))}
          </div>

          {formData.roles.includes('INSTRUCTOR') && (
            <>
              <Divider className="my-6" />
              
              <Typography variant="h6" className="mb-4 text-gray-700 flex items-center">
                <CalendarMonthIcon className="mr-2" />
                Calendriers synchronisés
              </Typography>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                {existingCalendars.length > 0 ? (
                  <List>
                    {existingCalendars.map((calendar) => (
                      <ListItem key={calendar.id} className="bg-white rounded-md mb-2 shadow-sm">
                        <ListItemText
                          primary={calendar.name}
                          secondary={calendar.id}
                          className="text-gray-800"
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                calendars: prev.calendars.filter(cal => cal.id !== calendar.id)
                              }));
                              setExistingCalendars(prev => prev.filter(cal => cal.id !== calendar.id));
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" className="text-gray-500 italic text-center py-4">
                    Aucun calendrier synchronisé
                  </Typography>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ImportCalendarIcon />}
                    onClick={() => setShowCalendarModal(true)}
                    className="w-full sm:flex-1"
                    size="large"
                  >
                    Importer un Google Calendar
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<IosShareIcon />}
                    onClick={getCalendarUrl}
                    className="w-full sm:flex-1"
                    size="large"
                  >
                    Exporter mes réservations
                  </Button>
                </div>

                {calendarUrl && (
                  <div className="mt-4 p-4 bg-white rounded-md border border-gray-200">
                    <Typography variant="body2" className="text-gray-600 mb-2">
                      Pour voir vos réservations dans Google Agenda, copiez cette URL et ajoutez-la dans les paramètres de votre agenda Google :
                    </Typography>
                    <TextField
                      fullWidth
                      value={calendarUrl}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(calendarUrl);
                              toast.success('URL copiée dans le presse-papier');
                            }}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        ),
                      }}
                    />
                  </div>
                )}
              </div>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tarif horaire instructeur"
                    name="instructor_rate"
                    type="number"
                    value={formData.instructor_rate || ''}
                    onChange={handleChange}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <span className="text-gray-500">€/h</span>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Frais instructeur"
                    name="instructor_fee"
                    type="number"
                    value={formData.instructor_fee || ''}
                    onChange={handleChange}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <span className="text-gray-500">€</span>,
                    }}
                  />
                </Grid>
              </Grid>
            </>
          )}

          <Divider className="my-6" />

          <Typography variant="h6" className="mb-4 text-gray-700">
            Mot de passe
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nouveau mot de passe"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                helperText="Laissez vide pour ne pas modifier"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                variant="outlined"
                error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ""}
                helperText={formData.password !== formData.confirmPassword && formData.confirmPassword !== "" ? "Les mots de passe ne correspondent pas" : ""}
              />
            </Grid>
          </Grid>

          <Divider className="my-6" />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>

        {/* Modal d'ajout de calendrier */}
        <Dialog open={showCalendarModal} onClose={() => setShowCalendarModal(false)}>
          <DialogTitle>Ajouter un calendrier Google</DialogTitle>
          <DialogContent>
            <div className="space-y-4 mt-4">
              <TextField
                fullWidth
                label="ID du calendrier Google"
                value={newCalendar.id}
                onChange={(e) => setNewCalendar(prev => ({ ...prev, id: e.target.value }))}
                variant="outlined"
                placeholder="ID du calendrier (ex: example@group.calendar.google.com)"
                helperText="Vous pouvez trouver l'ID dans les paramètres de votre calendrier Google"
              />
              <TextField
                fullWidth
                label="Nom du calendrier"
                value={newCalendar.name}
                onChange={(e) => setNewCalendar(prev => ({ ...prev, name: e.target.value }))}
                variant="outlined"
                placeholder="Ex: Calendrier personnel"
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCalendarModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddCalendar}
              variant="contained" 
              color="primary"
              disabled={!newCalendar.id || !newCalendar.name}
            >
              Ajouter
            </Button>
          </DialogActions>
        </Dialog>

      </CardContent>
    </Card>
  );
};

export default EditPilotForm;