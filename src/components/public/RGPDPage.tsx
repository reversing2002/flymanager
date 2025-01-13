import React from 'react';
import { motion } from 'framer-motion';

const RGPDPage = () => {
  return (
    <div className="min-h-screen bg-[#1a1d21] py-16 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Politique de Protection des Données
        </h1>

        <div className="space-y-8 text-gray-300">
          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
            <p className="mb-4">
              4fly s'engage à protéger la vie privée des utilisateurs de sa plateforme de gestion d'aéroclub. 
              Cette politique de protection des données explique comment nous collectons, utilisons et protégeons vos informations personnelles.
            </p>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Données Collectées</h2>
            <p className="mb-4">Nous collectons les informations suivantes :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Informations d'identification (nom, prénom, email)</li>
              <li>Données de licence et qualifications aéronautiques</li>
              <li>Informations de vol et de réservation</li>
              <li>Données de formation et de progression</li>
              <li>Informations de paiement (traitées de manière sécurisée)</li>
            </ul>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Utilisation des Données</h2>
            <p className="mb-4">Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Gérer les réservations et les vols</li>
              <li>Assurer le suivi de la maintenance des appareils</li>
              <li>Gérer la formation et la progression des élèves</li>
              <li>Traiter les paiements</li>
              <li>Communiquer des informations importantes relatives au club</li>
            </ul>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Protection des Données</h2>
            <p className="mb-4">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Chiffrement des données sensibles</li>
              <li>Accès restreint aux données personnelles</li>
              <li>Sauvegardes régulières et sécurisées</li>
              <li>Surveillance continue de la sécurité</li>
            </ul>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Vos Droits</h2>
            <p className="mb-4">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Droit d'accès à vos données personnelles</li>
              <li>Droit de rectification des données inexactes</li>
              <li>Droit à l'effacement de vos données</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité de vos données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
            <p className="mb-4">
              Pour toute question concernant la protection de vos données ou pour exercer vos droits, 
              vous pouvez nous contacter à l'adresse : privacy@4fly.fr
            </p>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Mise à Jour</h2>
            <p>
              Cette politique de protection des données peut être mise à jour périodiquement. 
              La dernière mise à jour date du 13 janvier 2025.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default RGPDPage;
