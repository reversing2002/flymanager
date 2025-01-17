import { QRCodeSVG } from "qrcode.react"
import { Copy, Mail, MapPin, Phone, ChevronDown } from 'lucide-react'
import { motion } from "framer-motion"
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Logo } from '../common/Logo'

export default function EnhancedDiscoveryPage() {
  const { user } = useAuth()
  const clubId = user?.club?.id

  // Récupération des informations du club
  const { data: clubData } = useQuery({
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

  // Récupération des informations des vols découverte avec leurs caractéristiques
  const { data: discoveryFlightPrices } = useQuery({
    queryKey: ['discoveryFlightPrices', clubId],
    queryFn: async () => {
      if (!clubId) return null;
      
      // 1. Récupérer les prix de base
      const { data: pricesData, error: pricesError } = await supabase
        .from('discovery_flight_prices')
        .select(`
          id,
          club_id,
          price,
          duration
        `)
        .eq('club_id', clubId)
        .order('price');

      if (pricesError) throw pricesError;

      // 2. Pour chaque prix, récupérer ses caractéristiques
      const pricesWithFeatures = await Promise.all((pricesData || []).map(async (price) => {
        const { data: featureData, error: featureError } = await supabase
          .from('discovery_flight_price_features')
          .select(`
            discovery_flight_features (
              id,
              description,
              display_order
            )
          `)
          .eq('price_id', price.id)
          .order('discovery_flight_features (display_order)');

        if (featureError) throw featureError;

        return {
          ...price,
          features: featureData?.map(item => item.discovery_flight_features) || []
        };
      }));

      return pricesWithFeatures;
    },
    enabled: !!clubId,
  })

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/discovery/new?${new URLSearchParams({
      ...(clubId ? { club: clubId } : {}),
    }).toString()}`)
    toast.success("L'URL a été copiée dans votre presse-papiers")
  }

  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Hero Section */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative h-full w-full bg-gradient-to-b from-[#1a2942] to-[#0B1120]"
        >
          <Logo className="absolute top-4 left-4 h-20 z-10" />
          {clubData?.logo_url ? (
            <img
              src={clubData.logo_url}
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
          <h1 className="mb-4 text-6xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
            Vol Découverte
          </h1>
          <p className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-3xl font-semibold text-transparent md:text-4xl lg:text-5xl">
            Découvrez nos formules
          </p>
          <p className="mt-4 text-xl text-white/90">
            Offrez-vous une expérience inoubliable !
          </p>
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="h-8 w-8 text-white/70" />
        </motion.div>
      </div>

      {/* Main Content with Cards */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {discoveryFlightPrices?.map((formula, index) => (
            <motion.div
              key={formula.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * index }}
              className="backdrop-blur-xl backdrop-filter rounded-xl border border-white/10 bg-white/5 p-8 text-white"
            >
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold">{formula.price}€</h2>
                <p className="text-lg text-white/70">{formula.duration} minutes</p>
              </div>
              <ul className="space-y-4 mb-8">
                {formula.features?.map((feature, featureIndex) => (
                  <motion.li
                    key={feature.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * featureIndex }}
                    className="flex items-center gap-3"
                  >
                    <div className="rounded-full bg-gradient-to-r from-orange-400 to-orange-600 p-1">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                    <span className="text-lg">{feature.description}</span>
                  </motion.li>
                ))}
              </ul>
              
              {/* QR Code spécifique à la formule */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="rounded-xl bg-white p-4 shadow-lg transition-transform hover:scale-105">
                  <QRCodeSVG
                    value={`${window.location.origin}/discovery/new?${new URLSearchParams({
                      ...(clubId ? { club: clubId } : {}),
                      formula: formula.id
                    }).toString()}`}
                    size={150}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>

              <div>
                <a
                  href={`/discovery/new?${new URLSearchParams({
                    ...(clubId ? { club: clubId } : {}),
                    formula: formula.id
                  }).toString()}`}
                  className="block w-full rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 px-4 py-3 text-center font-semibold text-white transition-transform hover:scale-105"
                >
                  Réserver maintenant
                </a>
              </div>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="backdrop-blur-xl backdrop-filter rounded-xl border border-white/10 bg-white/5 p-8 text-white md:col-span-2 lg:col-span-3"
          >
            <h3 className="mb-8 text-2xl font-semibold">Nous contacter</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: MapPin, text: clubData?.address || "Aérodrome" },
                { icon: Phone, text: clubData?.phone || "Contactez-nous" },
                { icon: Mail, text: clubData?.email || "contact@club.fr" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 * index }}
                  className="flex items-center gap-4 rounded-lg bg-white/5 p-4 backdrop-blur"
                >
                  <item.icon className="h-5 w-5 text-orange-400" />
                  <span className="text-lg">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
