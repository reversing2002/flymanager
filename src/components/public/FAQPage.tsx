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

const categories = [
  {
    title: 'À propos de 4fly',
    icon: <HelpIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Qu'est-ce que 4fly et à qui s'adresse-t-il ?",
        answer: "4fly est une solution logicielle complète conçue pour simplifier et optimiser la gestion des aéro-clubs. Elle s'adresse aux aéro-clubs de toutes tailles, qu'ils soient affiliés ou non à la FFA, et qui cherchent à automatiser et centraliser leurs opérations quotidiennes."
      },
      {
        question: "Comment fonctionne le modèle de tarification ?",
        answer: "4fly propose une solution gratuite. Le modèle économique repose sur une commission unique prélevée uniquement sur les paiements effectués par carte bancaire via la plateforme. Il n'y a pas de frais d'abonnement ou de coûts cachés."
      },
      {
        question: "Puis-je tester 4fly avant de l'adopter ?",
        answer: "Oui, vous pouvez essayer 4fly gratuitement. Nous proposons une période d'essai complète qui vous permet de tester toutes les fonctionnalités sans engagement."
      },
      {
        question: "Quel support est disponible ?",
        answer: "Nous offrons un support technique par email et téléphone. Notre équipe est disponible pour vous aider dans la configuration initiale et pour répondre à vos questions au quotidien."
      }
    ]
  },
  {
    title: 'Réservations et Vols',
    icon: <FlightTakeoffIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Comment fonctionne le système de réservation ?",
        answer: "Le système de réservation est disponible 24/7 en ligne. Les membres peuvent réserver un appareil, voir les disponibilités en temps réel, et gérer leurs réservations depuis leur smartphone ou ordinateur."
      },
      {
        question: "Peut-on réserver plusieurs créneaux à l'avance ?",
        answer: "Oui, il est possible de faire des réservations multiples selon les règles définies par votre club. Le système vérifie automatiquement les conflits et les qualifications nécessaires."
      },
      {
        question: "Comment sont gérés les vols d'instruction ?",
        answer: "Les vols d'instruction peuvent être planifiés avec les instructeurs disponibles. Le système vérifie automatiquement la disponibilité des instructeurs et des appareils."
      },
      {
        question: "Que se passe-t-il en cas d'annulation ?",
        answer: "Les annulations sont gérées selon les règles de votre club. Le système peut envoyer des notifications automatiques aux personnes concernées et libérer le créneau pour d'autres réservations."
      }
    ]
  },
  {
    title: 'Maintenance',
    icon: <BuildIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Comment est suivi l'entretien des appareils ?",
        answer: "4fly intègre un système complet de suivi de maintenance qui surveille les heures de vol, les cycles, et les échéances calendaires. Des alertes automatiques sont envoyées pour les maintenances à venir."
      },
      {
        question: "Qui peut déclarer une maintenance ?",
        answer: "Les mécaniciens et le personnel autorisé peuvent enregistrer les opérations de maintenance. Chaque intervention est documentée et archivée dans l'historique de l'appareil."
      },
      {
        question: "Comment sont gérées les alertes de maintenance ?",
        answer: "Le système envoie des notifications automatiques aux responsables lorsqu'une maintenance approche. Les pilotes sont également informés des limitations ou indisponibilités des appareils."
      },
      {
        question: "Peut-on personnaliser les types de maintenance ?",
        answer: "Oui, vous pouvez définir des types de maintenance personnalisés selon vos besoins, avec des intervalles basés sur les heures de vol, les cycles, ou le calendrier."
      }
    ]
  },
  {
    title: 'Formation',
    icon: <SchoolIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Comment sont suivis les élèves ?",
        answer: "Chaque élève dispose d'un livret de progression numérique. Les instructeurs peuvent suivre leur progression, noter les exercices effectués et planifier les prochaines leçons."
      },
      {
        question: "Peut-on personnaliser le programme de formation ?",
        answer: "Oui, les programmes de formation sont entièrement personnalisables selon vos besoins. Vous pouvez créer différents cursus pour le PPL, le LAPL, ou d'autres qualifications."
      },
      {
        question: "Comment sont gérés les examens théoriques ?",
        answer: "La plateforme inclut un module de quiz et d'examens théoriques. Les instructeurs peuvent créer des tests, suivre les résultats et identifier les points à améliorer."
      },
      {
        question: "Les élèves peuvent-ils suivre leur progression ?",
        answer: "Oui, chaque élève a accès à son espace personnel où il peut suivre sa progression, réviser ses cours, et préparer ses examens."
      }
    ]
  },
  {
    title: 'Gestion des Membres',
    icon: <GroupIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Comment sont gérées les adhésions ?",
        answer: "4fly permet de gérer les adhésions, les cotisations et les licences. Des rappels automatiques sont envoyés pour les renouvellements."
      },
      {
        question: "Peut-on définir différents types de membres ?",
        answer: "Oui, vous pouvez créer différents profils (élève, pilote, instructeur, mécanicien, etc.) avec des droits d'accès spécifiques."
      },
      {
        question: "Comment sont gérés les documents des membres ?",
        answer: "Tous les documents (licences, certificats médicaux, qualifications) sont stockés numériquement et le système alerte automatiquement des expiration à venir."
      }
    ]
  },
  {
    title: 'Paiements et Comptabilité',
    icon: <PaymentsIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Comment fonctionnent les paiements en ligne ?",
        answer: "4fly intègre un système de paiement sécurisé par carte bancaire. Les membres peuvent recharger leur compte et payer leurs vols directement depuis la plateforme."
      },
      {
        question: "Quels sont les rapports financiers disponibles ?",
        answer: "La plateforme génère des rapports détaillés sur les vols, les paiements, et la comptabilité. Vous pouvez exporter ces données pour votre comptabilité."
      },
      {
        question: "Comment sont gérées les factures ?",
        answer: "Les factures sont générées automatiquement après chaque vol ou paiement. Elles sont archivées numériquement et peuvent être envoyées par email."
      }
    ]
  },
  {
    title: 'Sécurité et Données',
    icon: <SecurityIcon className="h-6 w-6" />,
    questions: [
      {
        question: "Comment sont protégées les données ?",
        answer: "Toutes les données sont stockées de manière sécurisée et cryptée. Nous respectons les normes RGPD et assurons des sauvegardes régulières."
      },
      {
        question: "Qui a accès aux données du club ?",
        answer: "L'accès aux données est strictement contrôlé par un système de permissions. Seules les personnes autorisées peuvent accéder aux informations sensibles."
      },
      {
        question: "Peut-on exporter nos données ?",
        answer: "Oui, vous pouvez exporter vos données à tout moment dans des formats standards (CSV, Excel). Nous facilitons également la migration depuis d'autres systèmes."
      },
      {
        question: "Comment est assurée la continuité de service ?",
        answer: "Notre infrastructure est hébergée sur des serveurs redondants avec une haute disponibilité. Nous effectuons des sauvegardes quotidiennes de toutes les données."
      }
    ]
  }
];

const FAQPage = () => {
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
          Questions fréquentes
        </h1>
        <p className="text-gray-400 text-center mb-12">
          Retrouvez ici les réponses aux questions les plus fréquemment posées sur 4fly
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
