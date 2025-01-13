import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Logo } from '../common/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import toast from 'react-hot-toast';

const menuItems = [
  {
    path: '/',
    label: 'Accueil',
    icon: <HomeIcon className="w-6 h-6" />,
  },
  {
    path: '/features',
    label: 'Fonctionnalités',
    icon: <InfoIcon className="w-6 h-6" />,
  },
  {
    path: '/faq',
    label: 'FAQ',
    icon: <QuestionAnswerIcon className="w-6 h-6" />,
  },
  {
    path: '/contact',
    label: 'Contact',
    icon: <ContactSupportIcon className="w-6 h-6" />,
  }
];

interface PublicSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const PublicSidebar: React.FC<PublicSidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(credentials.email, credentials.password);
      navigate('/dashboard');  // Redirection vers le dashboard après connexion
      toast.success('Connexion réussie');
    } catch (error) {
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Bouton toggle pour mobile */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-30 lg:hidden bg-[#2a2e33] p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? '240px' : '0px',
          opacity: isOpen ? 1 : 0
        }}
        className={`fixed top-0 left-0 h-full bg-[#1a1d21] border-r border-gray-800 z-20 overflow-hidden lg:relative lg:opacity-100 lg:w-64`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-800">
          <Link to="/" className="flex items-center">
            <Logo className="h-8 w-auto" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col h-full">
          <div className="flex-1">
            <div className="space-y-1 px-3">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center h-10 px-3 rounded-md transition-colors ${
                    location.pathname === item.path
                      ? 'text-white bg-[#2a2e33]'
                      : 'text-gray-400 hover:text-white hover:bg-[#2a2e33]'
                  }`}
                >
                  <span className="w-6 h-6 mr-3">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Section utilisateur en bas */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                ?
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Se connecter</div>
                <div className="text-xs text-gray-400">Accédez à votre compte</div>
              </div>
            </div>

            {/* Formulaire de connexion */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <TextField
                name="email"
                type="email"
                placeholder="Email"
                value={credentials.email}
                onChange={handleChange}
                size="small"
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4B5563' },
                    '&:hover fieldset': { borderColor: '#6B7280' },
                    '&.Mui-focused fieldset': { borderColor: '#3B82F6' },
                    backgroundColor: '#1a1d21',
                  },
                  '& input': { color: 'white', fontSize: '0.875rem' },
                  '& input::placeholder': { color: '#9CA3AF' },
                }}
              />
              <TextField
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={credentials.password}
                onChange={handleChange}
                size="small"
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#9CA3AF', '&:hover': { color: 'white' } }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4B5563' },
                    '&:hover fieldset': { borderColor: '#6B7280' },
                    '&.Mui-focused fieldset': { borderColor: '#3B82F6' },
                    backgroundColor: '#1a1d21',
                  },
                  '& input': { color: 'white', fontSize: '0.875rem' },
                  '& input::placeholder': { color: '#9CA3AF' },
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-9 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Footer mobile uniquement */}
            <div className="lg:hidden mt-4">
              <Link
                to="/create-club"
                className="block text-xs text-center text-gray-400 hover:text-white"
              >
                Pas encore inscrit ?
                <span className="block text-blue-400 hover:text-blue-300 mt-1">
                  Créer mon club gratuitement
                </span>
              </Link>
            </div>
          </div>
        </nav>
      </motion.aside>
    </>
  );
};

export default PublicSidebar;
