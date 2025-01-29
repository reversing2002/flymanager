import React, { useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import AviationImage from "../common/AviationImage";
import { TextField, Button, Checkbox, FormControlLabel, IconButton, InputAdornment, CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff, Email, Lock, FormatQuote } from "@mui/icons-material";
import toast from "react-hot-toast";
import { aviationQuotes } from "../../data/aviation-quotes";
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation();
  const { user, signIn, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const location = useLocation();
  const from = location.state?.from || "/";

  const backgroundImages = [
    'login-1.png',
    'login-2.png',
    'login-3.png',
    'login-4.png',
    'login-5.png',
    'login-6.png',
    'login-7.png',
    'login-8.png',
    'login-9.png',
    'login-10.png',
    'login-11.png'
  ];

  const randomImage = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  }, []);

  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * aviationQuotes.length);
    return aviationQuotes[randomIndex];
  }, []);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password, rememberMe);
      if (!error) {
        toast.success(t('login.success'));
      } else {
        toast.error(t('login.error'));
      }
    } catch (err) {
      console.error("Erreur lors de la connexion:", err);
      toast.error(t('login.error.unexpected'));
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d21] to-[#2a2e33] flex">
      {/* Partie gauche - Formulaire de connexion */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-16"
      >
        <div className="w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-3">{t('login.hero.title')}</h1>
            <p className="text-gray-400 text-lg">
              {t('login.hero.subtitle')}
            </p>
          </motion.div>

          <motion.form 
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <TextField
              fullWidth
              label={t('login.form.email.label')}
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('login.form.email.placeholder')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-input': { color: 'white' },
              }}
            />

            <TextField
              fullWidth
              label={t('login.form.password.label')}
              variant="outlined"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('login.form.password.placeholder')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock className="text-gray-400" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={t('login.form.password.toggle')}
                      onClick={handleTogglePassword}
                      edge="end"
                      className="text-gray-400"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-input': { color: 'white' },
              }}
            />

            <div className="flex items-center justify-between">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-checked': { color: '#3b82f6' },
                    }}
                  />
                }
                label={t('login.form.rememberMe')}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              />
              <Link
                to="/reset-password"
                className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                {t('login.form.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
              sx={{ textTransform: 'none', fontSize: '1rem' }}
            >
              {loading ? (
                <CircularProgress size={24} className="text-white" />
              ) : (
                t('login.form.submit')
              )}
            </Button>

            <div className="text-center mt-4">
              <Link
                to="/create-club"
                className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                {t('login.form.createClub')}
              </Link>
            </div>
          </motion.form>
        </div>
      </motion.div>

      {/* Partie droite - Image de fond */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:block lg:w-1/2 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 backdrop-blur-[2px] z-10" />
        <AviationImage
          imageName={randomImage}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="relative max-w-3xl mx-auto text-center px-12 py-16 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10"
          >
            <FormatQuote 
              className="absolute -top-8 -left-4 text-white/40 transform rotate-180" 
              sx={{ fontSize: '6rem' }} 
            />
            <blockquote className="font-serif italic text-2xl md:text-3xl lg:text-4xl text-white leading-relaxed mb-8 tracking-wide">
              "{t(`quotes.${randomQuote.id}.text`)}"
            </blockquote>
            <div className="flex flex-col items-center">
              <motion.cite 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="not-italic font-medium text-xl md:text-2xl text-white/90 mb-2"
              >
                {t(`quotes.${randomQuote.id}.author`)}
              </motion.cite>
              {randomQuote.role && (
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-base md:text-lg text-white/70"
                >
                  {t(`quotes.${randomQuote.id}.role`)}
                </motion.span>
              )}
            </div>
            <FormatQuote 
              className="absolute -bottom-8 -right-4 text-white/40" 
              sx={{ fontSize: '6rem' }} 
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
