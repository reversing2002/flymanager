import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { MedicalType } from "../../types/medicals";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

interface EditMedicalTypeFormProps {
  medicalType?: MedicalType;
  onSubmit: (data: Partial<MedicalType>) => void;
  onClose: () => void;
  open: boolean;
}

const EditMedicalTypeForm: React.FC<EditMedicalTypeFormProps> = ({
  medicalType,
  onSubmit,
  onClose,
  open,
}) => {
  const [formData, setFormData] = useState<Partial<MedicalType>>({
    name: "",
    description: "",
    validity_period: null,
    requires_end_date: false,
  });

  // Mettre à jour les données du formulaire quand medicalType change
  useEffect(() => {
    if (medicalType) {
      setFormData({
        name: medicalType.name || "",
        description: medicalType.description || "",
        validity_period: medicalType.validity_period,
        requires_end_date: medicalType.requires_end_date,
      });
    } else {
      // Réinitialiser le formulaire quand on ferme la modal
      setFormData({
        name: "",
        description: "",
        validity_period: null,
        requires_end_date: false,
      });
    }
  }, [medicalType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <MuiDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {medicalType ? "Modifier le type de certificat" : "Ajouter un type de certificat"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <div className="space-y-4">
            <TextField
              fullWidth
              label="Nom"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              multiline
              rows={3}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Période de validité (mois)"
              name="validity_period"
              type="number"
              value={formData.validity_period || ""}
              onChange={handleChange}
              disabled={!formData.requires_end_date}
              variant="outlined"
              size="small"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="requires_end_date"
                  checked={formData.requires_end_date}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      requires_end_date: checked,
                      validity_period: checked ? prev.validity_period || 12 : null,
                    }));
                  }}
                />
              }
              label="Nécessite une date de fin"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" color="primary">
            {medicalType ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </form>
    </MuiDialog>
  );
};

export default function MedicalTypesSettings() {
  const [types, setTypes] = useState<MedicalType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<MedicalType | undefined>();
  const { user } = useAuth();

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("medical_types")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setTypes(data || []);
    } catch (error) {
      console.error("Error fetching medical types:", error);
      toast.error("Erreur lors du chargement des types de certificats médicaux");
    }
  };

  const handleSubmit = async (data: Partial<MedicalType>) => {
    try {
      if (!user?.club?.id) {
        throw new Error("Vous devez être associé à un club pour effectuer cette action");
      }

      if (editingType) {
        const { error } = await supabase
          .from("medical_types")
          .update(data)
          .eq("id", editingType.id)
          .eq("club_id", user.club?.id); // Assure que l'utilisateur modifie un type de son club

        if (error) throw error;
        toast.success("Type de certificat modifié avec succès");
      } else {
        const { error } = await supabase.from("medical_types").insert([
          {
            ...data,
            club_id: user.club?.id,
            system_type: false, // Les types créés par les utilisateurs ne sont pas des types système
            display_order: types.length,
          },
        ]);

        if (error) throw error;
        toast.success("Type de certificat ajouté avec succès");
      }

      setIsModalOpen(false);
      setEditingType(undefined);
      fetchTypes();
    } catch (error: any) {
      console.error("Error managing medical type:", error);
      toast.error(error.message || "Erreur lors de la gestion du type de certificat");
    }
  };

  const handleDelete = async (type: MedicalType) => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce type de certificat médical ?"
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("medical_types")
        .delete()
        .eq("id", type.id);

      if (error) throw error;
      toast.success("Type de certificat supprimé avec succès");
      fetchTypes();
    } catch (error) {
      console.error("Error deleting medical type:", error);
      toast.error(
        "Erreur lors de la suppression du type de certificat médical"
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Types de certificats médicaux</h2>
        <button
          onClick={() => {
            setEditingType(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-sky-600 text-white hover:bg-sky-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un type
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <div
            key={type.id}
            className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{type.name}</h3>
                {type.description && (
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {type.validity_period
                    ? `Validité : ${type.validity_period} mois`
                    : "Validité : illimitée"}
                </p>
                {type.requires_end_date && (
                  <p className="text-sm text-gray-600 mt-1">
                    Nécessite une date de fin
                  </p>
                )}
                {type.system_type && (
                  <div className="mt-2 flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Type système</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingType(type);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  disabled={type.system_type}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {!type.system_type && (
                  <button
                    onClick={() => handleDelete(type)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditMedicalTypeForm
        medicalType={editingType}
        onSubmit={handleSubmit}
        onClose={() => {
          setIsModalOpen(false);
          setEditingType(undefined);
        }}
        open={isModalOpen}
      />
    </div>
  );
}
