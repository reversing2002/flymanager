import React from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SupportIcon from '@mui/icons-material/Support';
import SecurityIcon from '@mui/icons-material/Security';
import PaymentsIcon from '@mui/icons-material/Payments';

const categories = [
  {
    title: 'À propos de 4fly',
    icon: <QuestionAnswerIcon className="h-6 w-6" />,
    questions: [
      {
        question: 'C\'est quoi 4fly exactement ?',
        answer: '4fly est un outil simple pour gérer votre club au quotidien. Que vous ayez 2 ULM ou 10 avions, il s\'adapte à vos besoins. Plus besoin de jongler entre les tableurs Excel, les papiers et les SMS : tout est regroupé au même endroit !'
      },
      {
        question: 'Est-ce que c\'est compliqué à utiliser ?',
        answer: 'Non ! 4fly a été conçu pour être simple et intuitif. Pas besoin d\'être un expert en informatique. Si vous savez utiliser un smartphone, vous saurez utiliser 4fly. Et si vous avez besoin d\'aide, on est là pour vous guider.'
      }
    ]
  },
  {
    title: 'Prix et engagement',
    icon: <PaymentsIcon className="h-6 w-6" />,
    questions: [
      {
        question: 'Combien ça coûte ?',
        answer: 'Bonne nouvelle : 4fly est gratuit ! Vous ne payez que si vous utilisez les paiements par carte bancaire (une petite commission). Pas d\'abonnement, pas de frais cachés, pas de mauvaise surprise.'
      },
      {
        question: 'Est-ce que je peux arrêter quand je veux ?',
        answer: 'Bien sûr ! Vous n\'êtes pas engagé. Si 4fly ne vous convient pas, vous pouvez arrêter quand vous voulez. On vous aide même à récupérer vos données si vous le souhaitez.'
      }
    ]
  },
  {
    title: 'Aide et support',
    icon: <SupportIcon className="h-6 w-6" />,
    questions: [
      {
        question: 'Et si j\'ai besoin d\'aide ?',
        answer: 'On est là pour vous aider ! Vous pouvez nous contacter par email ou téléphone. On répond généralement dans la journée. On peut même faire une petite formation en visio si vous le souhaitez.'
      },
      {
        question: 'Comment démarrer avec 4fly ?',
        answer: 'C\'est très simple :\n\n1. Créez votre compte gratuitement\n2. Ajoutez vos appareils\n3. Invitez vos membres\n\nEt c\'est tout ! On vous guide pas à pas et vous pouvez commencer petit à petit, en utilisant uniquement ce dont vous avez besoin.'
      }
    ]
  },
  {
    title: 'Sécurité et données',
    icon: <SecurityIcon className="h-6 w-6" />,
    questions: [
      {
        question: 'Mes données sont-elles en sécurité ?',
        answer: 'Oui ! Vos données sont stockées en France et sauvegardées tous les jours. Seuls vous et les membres de votre club y ont accès. On prend la sécurité très au sérieux, mais sans vous compliquer la vie.'
      },
      {
        question: 'Est-ce que ça marche sur mobile ?',
        answer: 'Oui, 4fly fonctionne sur tous les appareils : ordinateur, tablette, smartphone. Vous pouvez même l\'utiliser hors connexion pour certaines fonctions !'
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
    <div className="min-h-screen bg-[#1a1d21] pt-20">
      {/* Hero Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-8">
            Des <span className="text-blue-500">questions</span> ?
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            On a rassemblé ici les questions les plus fréquentes. 
            Si vous ne trouvez pas votre réponse, n'hésitez pas à nous contacter, on est là pour vous aider !
          </p>
        </motion.div>
      </div>

      {/* FAQ Categories */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-12">
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

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">
            Une autre question ?
          </h2>
          <p className="text-gray-300 mb-8">
            Contactez-nous ! On vous répond rapidement.
          </p>
          <Link
            to="/contact"
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Nous contacter
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQPage;
