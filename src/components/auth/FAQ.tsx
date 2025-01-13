import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqData = [
  {
    question: "Qu'est-ce que 4fly et à qui s'adresse-t-il ?",
    answer: "4fly est une solution logicielle complète conçue pour simplifier et optimiser la gestion des aéro-clubs. Elle s'adresse aux aéro-clubs de toutes tailles, qu'ils soient affiliés ou non à la FFA, et qui cherchent à automatiser et centraliser leurs opérations quotidiennes."
  },
  {
    question: "Comment fonctionne le modèle de tarification de 4fly ?",
    answer: "4fly propose une solution gratuite. Le modèle économique repose sur une commission unique prélevée uniquement sur les paiements effectués par carte bancaire via la plateforme. Il n'y a pas de frais d'abonnement ou de coûts cachés."
  },
  {
    question: "Quelles sont les principales fonctionnalités de 4fly ?",
    answer: "4fly propose une large gamme de fonctionnalités : réservation en ligne des avions 24/7, suivi automatisé de la maintenance, gestion intégrée des paiements, système de formation et de suivi des élèves, plateforme de communication, et bien plus encore."
  },
  {
    question: "Comment 4fly simplifie-t-il la gestion administrative ?",
    answer: "4fly centralise toutes les données et automatise les tâches comme la facturation, les rappels de licences, les exports comptables et l'archivage numérique. Les profils des pilotes sont complets et les données sont synchronisées automatiquement."
  },
  {
    question: "Comment est assurée la sécurité des données ?",
    answer: "La sécurité est une priorité : authentification sécurisée, interface responsive, sauvegarde automatique des données, conformité RGPD et réglementations aéronautiques. 4fly offre aussi des outils pour la gestion de la conformité."
  }
];

const FAQ = () => {
  const [expanded, setExpanded] = React.useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto mt-8 space-y-4"
    >
      <h2 className="text-2xl font-semibold text-white mb-6 text-center">
        Questions fréquentes
      </h2>
      
      {faqData.map((item, index) => (
        <Accordion
          key={index}
          expanded={expanded === `panel${index}`}
          onChange={handleChange(`panel${index}`)}
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
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-gray-300"
              >
                {item.answer}
              </motion.div>
            </AnimatePresence>
          </AccordionDetails>
        </Accordion>
      ))}
    </motion.div>
  );
};

export default FAQ;
