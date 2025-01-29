import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Menu, MenuItem } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { code: 'fr', name: '🇫🇷 FR' },
  { code: 'en', name: '🇬🇧 EN' },
  { code: 'de', name: '🇩🇪 DE' },
  { code: 'es', name: '🇪🇸 ES' }
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    handleClose();
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language)?.name || languages[0].name;

  return (
    <div className="text-gray-300 hover:text-white">
      <IconButton
        onClick={handleClick}
        size="small"
        className="text-inherit hover:text-inherit"
        aria-label="select language"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1"
        >
          <LanguageIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium hidden sm:inline text-gray-400">
            {currentLanguage}
          </span>
        </motion.div>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          className: 'bg-gray-800 mt-2',
          elevation: 3
        }}
      >
        <AnimatePresence>
          {languages.map((lang) => (
            <MenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              selected={i18n.language === lang.code}
              className={`
                text-sm px-4 py-2 
                ${i18n.language === lang.code ? 'bg-gray-700 text-white' : 'text-gray-300'} 
                hover:bg-gray-700 hover:text-white
              `}
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
