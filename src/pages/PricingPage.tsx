import React from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard as CreditCardIcon, 
  CheckCircle as CheckCircleIcon, 
  AccountBalance as BankNoteIcon,
  Rocket as RocketIcon,
  Star as StarIcon,
  Diamond as DiamondIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageSEO from '../components/SEO/PageSEO';

interface Plan {
  name: string;
  icon: React.ElementType;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  commission?: string;
  support?: string;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const plans: Plan[] = [
    {
      name: 'Découverte',
      icon: RocketIcon,
      price: '0€',
      description: 'Parfait pour démarrer',
      commission: '3% de frais sur les paiements CB',
      support: 'Support par email',
      features: [
        'Gestion des réservations et plannings',
        'Gestion des membres',
        'Suivi de la flotte et des potentiels',
        'Suivi des cotisations, qualifications et licences',
        'Statistiques membres et heures de vols',
        'Tableau de bords personnalisés',
        'Gestion de la documentation du club',
        'Messagerie interne',
        'Alertes e-mails et mailing groupé',
        'Accepter la CB, contrat VAD inclus',
        'Gestions des comptes pilotes',
        'Météo aéronautique et balises de vent locales'
      ],
    },
    {
      name: 'Pro',
      icon: StarIcon,
      price: '49€',
      description: 'Pour les clubs en croissance',
      highlighted: true,
      commission: '2% sur les paiements CB',
      support: 'Support prioritaire',
      features: [
        'Toutes les fonctionnalités du pack Découverte +',
        'Personnalisation des fiches membres, infos des vols et aéronefs',
        'Suivi des formations des élèves et aquisition de compétences',
        'QCM d\'entrainements en ligne suivi par les instructeurs',
        'Paiement en ligne et gestion des vols découvertes avec conversations SMS', 
        'Accès API',
        'Sauvegardes automatiques'
      ],
    },
    {
      name: 'Enterprise',
      icon: DiamondIcon,
      price: 'Sur mesure',
      description: 'Pour les + grands clubs',
      commission: '2% sur les paiements CB',
      support: 'Support VIP 24/7',
      features: [
        'Toutes les fonctionnalités Pro',
        'Hébergement sur mesure',
        'Formation sur site',
        'Support technique prioritaire',
        'Account manager dédié',
      ],
    },
  ];

  return (
    <>
      <PageSEO pageType="pricing" />
      <div className="min-h-screen bg-[#1a1d21] py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden pb-4">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
              >
                Choisissez votre formule
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mx-auto mt-3 max-w-md text-base text-gray-400 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl"
              >
                Une tarification adaptée à tous les clubs
              </motion.p>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mx-auto max-w-7xl py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative rounded-lg p-8 ${
                    plan.highlighted 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-[#212529] text-gray-300 hover:bg-[#2a2f35]'
                  } transition-colors duration-300`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`rounded-full p-2 ${
                      plan.highlighted ? 'bg-blue-400' : 'bg-blue-500/10'
                    }`}>
                      <Icon className={`h-8 w-8 ${
                        plan.highlighted ? 'text-white' : 'text-blue-500'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${
                        plan.highlighted ? 'text-white' : 'text-white'
                      }`}>
                        {plan.name}
                      </h3>
                      <p className={
                        plan.highlighted ? 'text-blue-100' : 'text-gray-400'
                      }>
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className={`text-3xl font-bold ${
                      plan.highlighted ? 'text-white' : 'text-white'
                    }`}>
                      {plan.price}
                      {plan.price !== 'Sur mesure' && <span className="text-lg font-normal">/mois</span>}
                    </div>
                    <div className={
                      plan.highlighted ? 'text-blue-100' : 'text-gray-400'
                    }>
                      {plan.commission}
                    </div>
                    <div className={
                      plan.highlighted ? 'text-blue-100' : 'text-gray-400'
                    }>
                      {plan.support}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircleIcon className={`h-5 w-5 flex-shrink-0 ${
                          plan.highlighted ? 'text-white' : 'text-blue-500'
                        }`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate(plan.price === 'Sur mesure' ? '/contact' : '/create-club')}
                    className={`w-full rounded-lg py-3 px-6 font-medium transition-colors duration-300 ${
                      plan.highlighted
                        ? 'bg-white text-blue-500 hover:bg-blue-50'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {plan.price === 'Sur mesure' ? 'Contactez-nous' : 'Commencer'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingPage;
