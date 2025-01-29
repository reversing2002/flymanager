import React from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import PaymentsIcon from '@mui/icons-material/Payments';
import SecurityIcon from '@mui/icons-material/Security';
import HelpIcon from '@mui/icons-material/Help';
import GroupIcon from '@mui/icons-material/Group';
import { useTranslation } from 'react-i18next';

const FAQPage: React.FC = () => {
  const { t } = useTranslation();

  const categories = [
    {
      title: t('faqPage.categories.about.title'),
      icon: <HelpIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.about.questions', { returnObjects: true })
    },
    {
      title: t('faqPage.categories.reservations.title'),
      icon: <FlightTakeoffIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.reservations.questions', { returnObjects: true })
    },
    {
      title: t('faqPage.categories.maintenance.title'),
      icon: <BuildIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.maintenance.questions', { returnObjects: true })
    },
    {
      title: t('faqPage.categories.training.title'),
      icon: <SchoolIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.training.questions', { returnObjects: true })
    },
    {
      title: t('faqPage.categories.members.title'),
      icon: <GroupIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.members.questions', { returnObjects: true })
    },
    {
      title: t('faqPage.categories.payments.title'),
      icon: <PaymentsIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.payments.questions', { returnObjects: true })
    },
    {
      title: t('faqPage.categories.security.title'),
      icon: <SecurityIcon className="h-6 w-6" />,
      questions: t('faqPage.categories.security.questions', { returnObjects: true })
    }
  ];

  const [expanded, setExpanded] = React.useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] py-16 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          {t('faqPage.hero.title')}
        </h1>
        <p className="text-gray-400 text-center mb-12">
          {t('faqPage.hero.subtitle')}
        </p>

        <div className="space-y-8">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="bg-[#212529] p-6 rounded-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="text-blue-500">{category.icon}</div>
                <h2 className="text-2xl font-semibold text-white">{category.title}</h2>
              </div>

              <div className="space-y-4">
                {category.questions.map((item, index) => (
                  <Accordion
                    key={index}
                    expanded={expanded === `${categoryIndex}-${index}`}
                    onChange={handleChange(`${categoryIndex}-${index}`)}
                    sx={{
                      backgroundColor: '#2a2e33',
                      color: 'white',
                      borderRadius: '8px',
                      '&:before': {
                        display: 'none',
                      },
                      '&:not(:last-child)': {
                        marginBottom: '8px',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#363b42',
                        },
                      }}
                    >
                      <span className="text-gray-100 font-medium">{item.question}</span>
                    </AccordionSummary>
                    <AccordionDetails>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-gray-300 whitespace-pre-line"
                      >
                        {item.answer}
                      </motion.div>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default FAQPage;
