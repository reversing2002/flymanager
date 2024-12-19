import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button, TextField, Paper, Typography, Box } from "@mui/material";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const { resetPassword, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }

    try {
      await resetPassword(email);
      toast.success(
        "Un email de réinitialisation a été envoyé à votre adresse email"
      );
      setEmail("");
    } catch (err) {
      console.error(err);
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
          Réinitialisation du mot de passe
        </Typography>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            error={!!error}
            helperText={error}
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Envoi en cours..." : "Envoyer le lien"}
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
