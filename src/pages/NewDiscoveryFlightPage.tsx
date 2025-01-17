import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { createStripeSession, redirectToCheckout } from '../lib/stripe'
import toast from 'react-hot-toast'
import { Users, Weight, Calendar, MessageSquare } from 'lucide-react'
import { Logo } from '../components/common/Logo'

interface FormData {
  contact_email: string
  contact_phone: string
  passenger_count: number
  total_weight: number
  preferred_dates?: string
  comments?: string
  club_id: string
  formula_id: string
}

export default function NewDiscoveryFlightPage() {
  const [searchParams] = useSearchParams()
  const clubId = searchParams.get('club')
  const formulaId = searchParams.get('formula')

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      if (!clubId) return null
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!clubId,
  })

  const { data: selectedFormula } = useQuery({
    queryKey: ['discoveryFlightFormula', clubId, formulaId],
    queryFn: async () => {
      if (!clubId || !formulaId) return null

      // 1. Récupérer la formule
      const { data: priceData, error: priceError } = await supabase
        .from('discovery_flight_prices')
        .select('*')
        .eq('id', formulaId)
        .eq('club_id', clubId)
        .single()

      if (priceError) throw priceError

      // 2. Récupérer les caractéristiques de la formule
      const { data: featureData, error: featureError } = await supabase
        .from('discovery_flight_price_features')
        .select(`
          discovery_flight_features (
            id,
            description,
            display_order
          )
        `)
        .eq('price_id', formulaId)
        .order('discovery_flight_features (display_order)')

      if (featureError) throw featureError

      return {
        ...priceData,
        features: featureData?.map(item => item.discovery_flight_features) || []
      }
    },
    enabled: !!clubId && !!formulaId,
  })

  const { data: discoveryFlightPrice } = useQuery({
    queryKey: ['discoveryFlightPrice', clubId],
    queryFn: async () => {
      if (!clubId) return null
      const { data, error } = await supabase
        .from('discovery_flight_prices')
        .select('*')
        .eq('club_id', clubId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!clubId,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      club_id: clubId || '',
      formula_id: formulaId || '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (!selectedFormula) {
        throw new Error('Aucune formule sélectionnée');
      }

      // Créer la réservation dans Supabase
      const { data: flightData, error: flightError } = await supabase
        .from('discovery_flights')
        .insert([
          {
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            passenger_count: data.passenger_count,
            total_weight: data.total_weight,
            preferred_dates: data.preferred_dates,
            comments: data.comments,
            club_id: data.club_id,
            formula_id: data.formula_id,
            status: 'PENDING',
          },
        ])
        .select()
        .single()

      if (flightError) throw flightError

      // Créer une conversation Twilio pour ce vol
      const conversationResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/conversations/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            flightId: flightData.id,
            customerPhone: data.contact_phone,
          }),
        }
      )

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json().catch(() => ({}))
        console.error('Erreur lors de la création de la conversation:', errorData)
      }

      // Créer la session de paiement Stripe et rediriger
      const sessionId = await createStripeSession({
        flightId: flightData.id,
        customerEmail: data.contact_email,
        customerPhone: data.contact_phone,
        formula_id: selectedFormula.id
      })

      await redirectToCheckout(sessionId)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la réservation'
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Hero Section */}
      <div className="relative h-[30vh] w-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative h-full w-full bg-gradient-to-b from-[#1a2942] to-[#0B1120]"
        >
          <Logo className="absolute top-4 left-4 h-20 z-10" />
          {club?.logo_url ? (
            <img
              src={club.logo_url}
              alt="Logo du club"
              className="absolute top-4 left-4 h-20 z-10"
            />
          ) : null}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Réserver votre vol découverte
          </h1>
          <p className="text-xl text-white/80">
            {selectedFormula?.duration || 30} minutes de vol pour{' '}
            {selectedFormula?.price || 130}€
          </p>
        </motion.div>
      </div>

      {/* Form Section */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="backdrop-blur-xl backdrop-filter rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl"
        >
          {selectedFormula?.features && selectedFormula.features.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Cette formule inclut :</h2>
              <ul className="space-y-2">
                {selectedFormula.features.map((feature: any) => (
                  <li key={feature.id} className="flex items-center gap-2 text-white/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                    <span>{feature.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Information */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="votre@email.com"
                  {...register('contact_email', {
                    required: "L'email est requis",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide',
                    },
                  })}
                />
                {errors.contact_email && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.contact_email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Téléphone
                </label>
                <input
                  type="tel"
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="+33 6 12 34 56 78"
                  {...register('contact_phone', {
                    required: 'Le téléphone est requis',
                  })}
                />
                {errors.contact_phone && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.contact_phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Flight Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white">
                  Nombre de passagers
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="1-3"
                    {...register('passenger_count', {
                      required: 'Le nombre de passagers est requis',
                      min: { value: 1, message: 'Minimum 1 passager' },
                      max: { value: 3, message: 'Maximum 3 passagers' },
                    })}
                  />
                </div>
                {errors.passenger_count && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.passenger_count.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Poids total (kg)
                  <span className="ml-1 text-xs text-white/60">
                    (maximum 200kg)
                  </span>
                </label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Poids total des passagers"
                    {...register('total_weight', {
                      required: 'Le poids total est requis',
                      min: { value: 30, message: "Le poids doit être d'au moins 30kg" },
                      max: { value: 200, message: 'Le poids total ne peut pas dépasser 200kg' },
                    })}
                  />
                </div>
                {errors.total_weight && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.total_weight.message}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <label className="block text-sm font-medium text-white">
                Dates souhaitées
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Ex: Les weekends, en semaine..."
                  {...register('preferred_dates')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                Commentaires
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-white/50" />
                <textarea
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-white placeholder-white/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  rows={3}
                  placeholder="Questions ou remarques particulières..."
                  {...register('comments')}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition-all hover:from-orange-500 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#0B1120] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Réservation en cours...' : 'Réserver maintenant'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
