import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button, TextField, Paper, Typography, Box } from "@mui/material";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const { resetPassword, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("resetPassword.emailError"));
      return;
    }

    try {
      await resetPassword(email);
      toast.success(t("resetPassword.toast.success"));
      setEmail("");
    } catch (err) {
      toast.error(t("resetPassword.toast.error"));
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "#1a1d21",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: "400px",
          width: "100%",
          bgcolor: "#2a2e33",
          color: "white",
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center" color="white">
          {t("resetPassword.title")}
        </Typography>

        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" align="center" sx={{ mb: 3 }}>
          {t("resetPassword.description")}
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t("resetPassword.emailLabel")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            error={!!error}
            helperText={error}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3b82f6',
                },
                '& input': {
                  color: 'white',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-focused': {
                  color: '#3b82f6',
                },
              },
              '& .MuiFormHelperText-root': {
                color: '#ef4444',
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              bgcolor: '#3b82f6',
              '&:hover': {
                bgcolor: '#2563eb',
              },
            }}
            disabled={loading}
          >
            {loading ? t("resetPassword.submitting") : t("resetPassword.submitButton")}
          </Button>

          <Button
            fullWidth
            variant="text"
            href="/login"
            sx={{
              mt: 2,
              color: '#60a5fa',
              '&:hover': {
                color: '#3b82f6',
              },
            }}
            disabled={loading}
          >
            {t("resetPassword.backToLogin")}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
