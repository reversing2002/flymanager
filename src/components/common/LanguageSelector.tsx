import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Menu, MenuItem, alpha } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { motion, AnimatePresence } from 'framer-motion';
import useLanguageNavigation from '../../hooks/useLanguageNavigation';

const languages = [
  { code: 'fr', name: '🇫🇷 FR' },
  { code: 'en', name: '🇬🇧 EN' },
  { code: 'de', name: '🇩🇪 DE' },
  { code: 'es', name: '🇪🇸 ES' },
  { code: 'it', name: '🇮🇹 IT' },
  { code: 'pt', name: '🇵🇹 PT' },
  { code: 'nl', name: '🇳🇱 NL' },
  { code: 'pl', name: '🇵🇱 PL' },
  { code: 'cs', name: '🇨🇿 CS' },
  { code: 'sv', name: '🇸🇪 SE' },
  { code: 'ar', name: '🇸🇦 AR' }
];

const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();
  const { changeLanguage, currentLanguage } = useLanguageNavigation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (code: string) => {
    changeLanguage(code);
    handleClose();
  };

  const currentLanguageName = languages.find(lang => lang.code === currentLanguage)?.name || languages[0].name;

  return (
    <div className="relative">
      <IconButton
        onClick={handleClick}
        size="small"
        className="transition-all duration-200 ease-in-out hover:bg-gray-700/50"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: alpha('#fff', 0.1),
          },
        }}
        aria-label={t('common.selectLanguage')}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2"
        >
          <LanguageIcon className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">
            {currentLanguageName}
          </span>
        </motion.div>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: 'rgb(31, 41, 55)',
            borderRadius: '0.5rem',
            border: '1px solid rgb(75, 85, 99)',
            marginTop: '0.5rem',
            minWidth: '120px',
          },
          '& .MuiMenuItem-root': {
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
            color: 'rgb(209, 213, 219)',
            '&:hover': {
              backgroundColor: 'rgb(55, 65, 81)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgb(55, 65, 81)',
              '&:hover': {
                backgroundColor: 'rgb(75, 85, 99)',
              },
            },
          },
        }}
      >
        <AnimatePresence>
          {languages.map((lang) => (
            <MenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              selected={lang.code === currentLanguage}
              className="transition-colors duration-200"
            >
              {lang.name}
            </MenuItem>
          ))}
        </AnimatePresence>
      </Menu>
    </div>
  );
};

export default LanguageSelector;
