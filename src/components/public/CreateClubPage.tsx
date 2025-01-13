import React from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SettingsIcon from '@mui/icons-material/Settings';

const clubSchema = z.object({
  clubName: z.string().min(3, 'Le nom du club doit contenir au moins 3 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Numéro de téléphone invalide'),
  position: z.string().min(2, 'Votre fonction est requise'),
  clubSize: z.enum(['1-10', '11-30', '31-50', '51+']),
  message: z.string().optional(),
});

type ClubFormData = z.infer<typeof clubSchema>;

const steps = [
  {
    icon: <AirplanemodeActiveIcon className="h-6 w-6" />,
    title: 'Créez votre compte',
    description: 'Remplissez le formulaire avec les informations de votre club'
  },
  {
    icon: <SettingsIcon className="h-6 w-6" />,
    title: 'Configuration',
    description: 'Configurez vos appareils, membres et paramètres'
  },
  {
    icon: <GroupAddIcon className="h-6 w-6" />,
    title: 'Invitez vos membres',
    description: 'Commencez à utiliser 4fly avec votre équipe'
  }
];

const CreateClubPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
  });

  const onSubmit = async (data: ClubFormData) => {
    try {
      // TODO: Implémenter la création du club via l'API
      console.log('Form data:', data);
      toast.success('Demande envoyée avec succès ! Nous vous contacterons rapidement.');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Créez votre club sur 4fly
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Rejoignez les aéroclubs qui font confiance à 4fly pour leur gestion quotidienne.
            La création est gratuite et sans engagement.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#2a2e33] p-6 rounded-lg text-center"
            >
              <div className="text-blue-500 mb-4 flex justify-center">
                {step.icon}
              </div>
              <h3 className="text-white font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#2a2e33] p-8 rounded-lg max-w-2xl mx-auto"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="clubName" className="block text-sm font-medium text-gray-300">
                  Nom de l'aéroclub
                </label>
                <input
                  {...register('clubName')}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.clubName && (
                  <p className="mt-1 text-sm text-red-500">{errors.clubName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="clubSize" className="block text-sm font-medium text-gray-300">
                  Nombre de membres
                </label>
                <select
                  {...register('clubSize')}
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1-10">1-10 membres</option>
                  <option value="11-30">11-30 membres</option>
                  <option value="31-50">31-50 membres</option>
                  <option value="51+">51+ membres</option>
                </select>
                {errors.clubSize && (
                  <p className="mt-1 text-sm text-red-500">{errors.clubSize.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">
                  Prénom
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">
                  Nom
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                  Téléphone
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="position" className="block text-sm font-medium text-gray-300">
                  Votre fonction dans le club
                </label>
                <input
                  {...register('position')}
                  type="text"
                  placeholder="Ex: Président, Trésorier, Chef-pilote..."
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-500">{errors.position.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="message" className="block text-sm font-medium text-gray-300">
                  Message (optionnel)
                </label>
                <textarea
                  {...register('message')}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 bg-[#363b42] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Questions ou besoins particuliers..."
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 text-white py-3 px-8 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Créer mon club'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateClubPage;
