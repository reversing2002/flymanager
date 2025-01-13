import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupIcon from '@mui/icons-material/Group';

const features = [
  {
    icon: <FlightTakeoffIcon className="h-6 w-6" />,
    title: 'Gestion des Vols',
    description: 'Planification et suivi des vols en temps réel'
  },
  {
    icon: <ScheduleIcon className="h-6 w-6" />,
    title: 'Réservations',
    description: 'Système de réservation en ligne 24/7'
  },
  {
    icon: <BuildIcon className="h-6 w-6" />,
    title: 'Maintenance',
    description: 'Suivi de maintenance et alertes automatiques'
  },
  {
    icon: <SchoolIcon className="h-6 w-6" />,
    title: 'Formation',
    description: 'Gestion complète de la formation des élèves'
  },
  {
    icon: <PaymentsIcon className="h-6 w-6" />,
    title: 'Paiements',
    description: 'Gestion simplifiée des paiements et factures'
  },
  {
    icon: <GroupIcon className="h-6 w-6" />,
    title: 'Gestion des Membres',
    description: 'Administration efficace des membres du club'
  }
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#1a1d21]">
      {/* Hero Section */}
      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-8">
            Gérez votre club{' '}
            <span className="text-blue-500">simplement</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            4fly est un outil simple et gratuit pour gérer votre club aéronautique, que vous ayez 2 ou 200 membres. 
            Fini les tableurs complexes et la paperasse !
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/create-club"
              className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              Essayer gratuitement
            </Link>
            <Link
              to="/features"
              className="border border-gray-600 text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:border-blue-500 hover:text-white transition-colors"
            >
              Voir les fonctionnalités
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-[#212529]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Simple et adapté à tous les clubs
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            Que vous gériez un petit club ULM ou un grand aéroclub, 4fly s'adapte à vos besoins.
            Utilisez uniquement ce dont vous avez besoin !
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#2a2e33] p-6 rounded-lg hover:bg-[#363b42] transition-colors"
              >
                <div className="text-blue-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Envie d'essayer ?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            C'est gratuit et sans engagement. Commencez dès maintenant et découvrez comme il est facile de gérer votre club !
          </p>
          <Link
            to="/create-club"
            className="inline-block bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors shadow-lg"
          >
            Créer mon club gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
