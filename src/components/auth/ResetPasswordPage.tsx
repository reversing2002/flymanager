import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const resetSchema = z.object({
  email: z.string().email('Email invalide')
});

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
      toast.success('Instructions envoyées par email');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi des instructions');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#1a1d21] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {!isSubmitted ? (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              Réinitialisation du mot de passe
            </h1>

            <div className="bg-[#2a2e33] p-8 rounded-lg">
              <p className="text-gray-300 mb-6">
                Entrez votre adresse email pour recevoir les instructions de réinitialisation de votre mot de passe.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Envoi...' : 'Envoyer les instructions'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Retour à la connexion
                </a>
              </div>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#2a2e33] p-8 rounded-lg text-center"
          >
            <div className="text-green-500 mb-4">
              <svg
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Instructions envoyées !
            </h2>
            <p className="text-gray-300 mb-6">
              Vérifiez votre boîte mail et suivez les instructions pour réinitialiser votre mot de passe.
            </p>
            <a
              href="/login"
              className="text-blue-400 hover:text-blue-300"
            >
              Retour à la connexion
            </a>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
