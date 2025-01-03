import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button, TextField, Paper, Typography, Box } from "@mui/material";
import toast from "react-hot-toast";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        toast.error("Session invalide ou expirée");
        navigate("/login");
        return;
      }
    };

    handlePasswordRecovery();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès");
      
      // Se déconnecter pour forcer une nouvelle connexion avec le nouveau mot de passe
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
      toast.error("Erreur lors de la mise à jour du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center">
          Nouveau mot de passe
        </Typography>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Veuillez entrer votre nouveau mot de passe
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nouveau mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </Button>

          <Button
            fullWidth
            variant="text"
            href="/login"
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Retour à la connexion
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
