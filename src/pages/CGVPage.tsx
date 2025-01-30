import React from 'react';
import { motion } from 'framer-motion';

const CGVPage = () => {
  const sections = [
    {
      title: 'Article 1 - Objet',
      content: `Les présentes conditions générales de vente (CGV) régissent l'utilisation de la plateforme 4fly, solution de gestion pour aéro-clubs. Ces conditions s'appliquent à l'exclusion de toutes autres conditions.`
    },
    {
      title: 'Article 2 - Services',
      content: `4fly propose une plateforme de gestion complète incluant :
      - Gestion des réservations d'aéronefs
      - Suivi de la maintenance
      - Gestion des formations
      - Administration des membres
      - Facturation et paiements
      - Outils de communication`
    },
    {
      title: 'Article 3 - Tarification',
      content: `L'utilisation de la plateforme 4fly est gratuite. Une commission est uniquement prélevée sur les paiements par carte bancaire effectués via la plateforme. Le taux de commission est clairement indiqué lors de chaque transaction.`
    },
    {
      title: 'Article 4 - Obligations',
      content: `4fly s'engage à :
      - Assurer la disponibilité et la maintenance de la plateforme
      - Sécuriser les données des utilisateurs
      - Fournir un support technique
      
      L'utilisateur s'engage à :
      - Fournir des informations exactes
      - Respecter les conditions d'utilisation
      - Ne pas détourner l'usage de la plateforme`
    },
    {
      title: 'Article 5 - Données Personnelles',
      content: `4fly collecte et traite les données personnelles conformément au RGPD. Les utilisateurs disposent d'un droit d'accès, de rectification et de suppression de leurs données.`
    },
    {
      title: 'Article 6 - Propriété Intellectuelle',
      content: `L'ensemble des éléments de la plateforme 4fly (logo, textes, images, etc.) sont protégés par le droit de la propriété intellectuelle. Toute reproduction est interdite sans autorisation préalable.`
    },
    {
      title: 'Article 7 - Responsabilité',
      content: `4fly ne pourra être tenue responsable des dommages indirects résultant de l'utilisation de la plateforme. La responsabilité est limitée au montant des services payés par l'utilisateur.`
    },
    {
      title: 'Article 8 - Résiliation',
      content: `Chaque partie peut résilier l'utilisation des services dans les conditions prévues. En cas de manquement grave, la résiliation peut être immédiate.`
    },
    {
      title: 'Article 9 - Droit Applicable',
      content: `Les présentes CGV sont soumises au droit français. Tout litige relève de la compétence exclusive des tribunaux français.`
    }
  ];

  return (
    <div className="min-h-screen bg-[#1a1d21] pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Conditions Générales de Vente
          </h1>
          <p className="text-gray-300">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#2a2e33] p-6 rounded-lg"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                {section.title}
              </h2>
              <div className="text-gray-300 space-y-2 whitespace-pre-line">
                {section.content}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-gray-400 text-sm"
        >
          Pour toute question concernant nos CGV, veuillez nous contacter à{' '}
          <a href="mailto:legal@4fly.io" className="text-blue-500 hover:text-blue-400">
            legal@4fly.io
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default CGVPage;
