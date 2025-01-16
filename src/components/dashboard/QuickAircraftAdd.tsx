import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface AircraftRow {
  id: string;
  name: string;
  registration: string;
  type: 'ULM' | 'PLANE' | '';
  hourly_rate: string;
}

const emptyRow: AircraftRow = {
  id: crypto.randomUUID(),
  name: '',
  registration: '',
  type: '',
  hourly_rate: '',
};

const QuickAircraftAdd = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<AircraftRow[]>([emptyRow]);
  const [error, setError] = useState<string | null>(null);

  const handleAddRow = () => {
    setRows([...rows, { ...emptyRow, id: crypto.randomUUID() }]);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const handleChange = (id: string, field: keyof AircraftRow, value: string) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const validateRow = (row: AircraftRow) => {
    if (!row.name || !row.registration || !row.type || !row.hourly_rate) {
      return false;
    }
    const rate = parseFloat(row.hourly_rate);
    if (isNaN(rate) || rate <= 0) {
      return false;
    }
    return row.type === 'ULM' || row.type === 'PLANE';
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Vérifier que l'utilisateur est connecté et a un club_id
      if (!user?.club_id) {
        throw new Error("Erreur d'identification du club");
      }
      
      // Valider toutes les lignes
      const invalidRows = rows.filter(row => !validateRow(row));
      if (invalidRows.length > 0) {
        throw new Error("Veuillez remplir tous les champs correctement");
      }

      // Préparer les données pour l'insertion
      const aircraftData = rows.map(row => ({
        name: row.name.trim(),
        registration: row.registration.trim().toUpperCase(),
        type: row.type.trim(),
        hourly_rate: parseFloat(row.hourly_rate),
        club_id: user.club_id,
        status: 'AVAILABLE'
      }));

      // Insérer dans Supabase
      const { error: insertError } = await supabase
        .from('aircraft')
        .insert(aircraftData);

      if (insertError) {
        console.error('Erreur Supabase:', insertError);
        throw new Error("Erreur lors de l'enregistrement des avions");
      }

      toast.success('Avions ajoutés avec succès !');
      setRows([emptyRow]); // Réinitialiser avec une ligne vide

    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message || "Une erreur est survenue");
      toast.error(err.message || "Erreur lors de l'ajout des avions");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          bgcolor: '#1a1d21',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2" sx={{ color: 'white' }}>
            Ajout rapide d'avions
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.23)',
              '&:hover': {
                borderColor: 'white',
              },
            }}
          >
            Ajouter une ligne
          </Button>
        </Box>

        <TableContainer sx={{ mb: 3 }}>
          <Table size="small" sx={{
            '& .MuiTableCell-root': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
            },
          }}>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Immatriculation</TableCell>
                <TableCell>Type d'appareil</TableCell>
                <TableCell>Tarif horaire (€)</TableCell>
                <TableCell width={50}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => handleChange(row.id, 'name', e.target.value)}
                      placeholder="DR400-180"
                      className="w-full bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={row.registration}
                      onChange={(e) => handleChange(row.id, 'registration', e.target.value)}
                      placeholder="F-GXXZ"
                      className="w-full bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 uppercase"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.type}
                      onChange={(e) => handleChange(row.id, 'type', e.target.value)}
                      displayEmpty
                      size="small"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: 'none'
                        },
                        '& .MuiSelect-icon': {
                          color: 'white'
                        },
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.05)'
                        },
                        minWidth: '120px'
                      }}
                    >
                      <MenuItem value="" disabled>
                        <em>Sélectionner...</em>
                      </MenuItem>
                      <MenuItem value="PLANE">Avion</MenuItem>
                      <MenuItem value="ULM">ULM</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={row.hourly_rate}
                      onChange={(e) => handleChange(row.id, 'hourly_rate', e.target.value)}
                      placeholder="180"
                      className="w-full bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={rows.length === 1}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          color: '#f44336',
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211, 47, 47, 0.1)' }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          sx={{
            bgcolor: '#3f51b5',
            '&:hover': {
              bgcolor: '#303f9f',
            },
          }}
        >
          Enregistrer les avions
        </Button>
      </Paper>
    </motion.div>
  );
};

export default QuickAircraftAdd;
