import React from 'react';
import { motion } from 'framer-motion';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupIcon from '@mui/icons-material/Group';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SecurityIcon from '@mui/icons-material/Security';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: <FlightTakeoffIcon className="h-8 w-8" />,
    title: 'Gestion des Vols',
    description: 'Suivi complet des vols, carnets de route digitaux, et statistiques détaillées pour chaque pilote et appareil.',
    details: [
      'Saisie simplifiée des vols',
      'Carnets de route digitaux',
      'Suivi du temps de vol',
      'Statistiques détaillées'
    ]
  },
  {
    icon: <ScheduleIcon className="h-8 w-8" />,
    title: 'Réservations',
    description: 'Système de réservation en ligne disponible 24/7 avec gestion des conflits et des disponibilités en temps réel.',
    details: [
      'Réservation en ligne 24/7',
      'Calendrier interactif',
      'Gestion des conflits',
      'Notifications automatiques'
    ]
  },
  {
    icon: <BuildIcon className="h-8 w-8" />,
    title: 'Maintenance',
    description: 'Suivi détaillé de la maintenance avec alertes automatiques et gestion des potentiels.',
    details: [
      'Suivi des potentiels',
      'Alertes automatiques',
      'Carnet de maintenance digital',
      'Historique complet'
    ]
  },
  {
    icon: <SchoolIcon className="h-8 w-8" />,
    title: 'Formation',
    description: 'Gestion complète de la formation avec suivi pédagogique et progression des élèves.',
    details: [
      'Livret de progression digital',
      'Planning des formations',
      'Suivi pédagogique',
      'Resources en ligne'
    ]
  },
  {
    icon: <PaymentsIcon className="h-8 w-8" />,
    title: 'Gestion Financière',
    description: 'Facturation automatique, suivi des comptes membres et intégration des paiements en ligne.',
    details: [
      'Facturation automatique',
      'Paiements en ligne',
      'Suivi des comptes',
      'Exports comptables'
    ]
  },
  {
    icon: <GroupIcon className="h-8 w-8" />,
    title: 'Gestion des Membres',
    description: 'Administration complète des membres avec gestion des licences et qualifications.',
    details: [
      'Profils détaillés',
      'Suivi des licences',
      'Gestion des qualifications',
      'Annuaire des membres'
    ]
  },
  {
    icon: <ChatIcon className="h-8 w-8" />,
    title: 'Communication',
    description: 'Outils de communication intégrés pour faciliter les échanges au sein du club.',
    details: [
      'Messagerie instantanée',
      'Annonces du club',
      'Notifications',
      'Partage de documents'
    ]
  },
  {
    icon: <AssessmentIcon className="h-8 w-8" />,
    title: 'Statistiques et Rapports',
    description: 'Tableaux de bord et rapports détaillés pour suivre l\'activité du club.',
    details: [
      'Tableaux de bord',
      'Rapports personnalisés',
      'Analyses d\'activité',
      'Exports de données'
    ]
  },
  {
    icon: <CalendarMonthIcon className="h-8 w-8" />,
    title: 'Événements',
    description: 'Organisation et gestion des événements du club avec inscriptions en ligne.',
    details: [
      'Calendrier des événements',
      'Inscriptions en ligne',
      'Gestion des participants',
      'Rappels automatiques'
    ]
  },
  {
    icon: <SecurityIcon className="h-8 w-8" />,
    title: 'Sécurité et Conformité',
    description: 'Outils pour assurer la sécurité et la conformité réglementaire.',
    details: [
      'Gestion des REX',
      'Suivi documentaire',
      'Conformité RGPD',
      'Sauvegardes automatiques'
    ]
  }
];

const FeaturesPage = () => {
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
            Fonctionnalités complètes pour votre{' '}
            <span className="text-blue-500">aéroclub</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Découvrez toutes les fonctionnalités qui font de 4fly la solution la plus complète pour la gestion de votre aéroclub.
          </p>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-[#212529]">
        <div className="max-w-7xl mx-auto">
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
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="text-gray-400 flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Prêt à moderniser votre aéroclub ?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Commencez gratuitement et découvrez toutes ces fonctionnalités par vous-même.
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

export default FeaturesPage;
