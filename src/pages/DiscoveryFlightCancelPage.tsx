import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { createStripeSession, redirectToCheckout } from '../lib/stripe'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { Logo } from '../components/common/Logo'

interface DiscoveryFlight {
  id: string
  contact_email: string
  contact_phone: string
  passenger_count: number
  total_weight: number
  preferred_dates?: string
  comments?: string
  club_id: string
  status: string
  clubs?: {
    name: string
    logo_url?: string
  }
}

export default function DiscoveryFlightCancelPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const flightId = searchParams.get('flight_id')
  const [isLoading, setIsLoading] = useState(false)

  const { data: flight, isLoading: isLoadingFlight } = useQuery<DiscoveryFlight>({
    queryKey: ['discovery_flight', flightId],
    queryFn: async () => {
      if (!flightId) return null
      const { data, error } = await supabase
        .from('discovery_flights')
        .select('*, clubs:club_id(*)')
        .eq('id', flightId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!flightId,
  })

  useEffect(() => {
    if (!isLoadingFlight && !flight) {
      toast.error('Vol découverte non trouvé')
      navigate('/discovery-flight')
    }
  }, [flight, isLoadingFlight, navigate])

  const handleRetryPayment = async () => {
    if (!flight) {
      toast.error('Données du vol manquantes')
      return
    }

    setIsLoading(true)
    try {
      const sessionId = await createStripeSession({
        flightId: flight.id,
        customerEmail: flight.contact_email,
        customerPhone: flight.contact_phone,
      })

      await redirectToCheckout(sessionId)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la création du paiement'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingFlight) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="animate-spin text-white">
          <RefreshCw size={32} />
        </div>
      </div>
    )
  }

  if (!flight) {
    return null
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
          {flight.clubs?.logo_url ? (
            <img
              src={flight.clubs.logo_url}
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
            Paiement annulé
          </h1>
          <p className="text-xl text-white/80">
            Vol découverte avec {flight.clubs?.name}
          </p>
        </motion.div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="backdrop-blur-xl backdrop-filter rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl"
        >
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Votre paiement n'a pas été complété
            </h2>
            <p className="text-white/80 mb-8">
              Vous pouvez réessayer le paiement en cliquant sur le bouton ci-dessous.
            </p>

            <div className="space-y-4">
              <button
                onClick={handleRetryPayment}
                disabled={isLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Chargement...
                  </span>
                ) : (
                  'Réessayer le paiement'
                )}
              </button>

              <button
                onClick={() => navigate('/discovery-flight')}
                className="w-full rounded-lg border border-white/20 bg-transparent px-4 py-3 text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
