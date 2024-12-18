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
  const qrCodeUrl = `${window.location.origin}/discovery/new${clubId ? `?club=${clubId}` : ''}`

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

  // Récupération des informations du vol découverte
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

  // Récupération des prestations incluses
  const { data: features } = useQuery({
    queryKey: ['discoveryFlightFeatures', clubId],
    queryFn: async () => {
      if (!clubId) return null
      const { data, error } = await supabase
        .from('discovery_flight_features')
        .select('*')
        .eq('club_id', clubId)
        .order('display_order')
      if (error) throw error
      return data || []
    },
    enabled: !!clubId,
  })

  const discoveryFlightInfo = {
    price: discoveryFlightPrice?.price ? `${discoveryFlightPrice.price}€` : '130€',
    duration: discoveryFlightPrice?.duration ? `${discoveryFlightPrice.duration} minutes` : '30 minutes',
  }
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCodeUrl)
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
            {discoveryFlightInfo.price}
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

      {/* QR Code Section with Glass Effect */}
      <div className="relative z-10 mx-auto -mt-20 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="backdrop-blur-xl backdrop-filter mx-4 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center justify-center">
            <h2 className="mb-6 text-2xl font-semibold text-white">Réservez maintenant</h2>
            <div className="rounded-xl bg-white p-4 shadow-lg transition-transform hover:scale-105">
              <QRCodeSVG
                value={qrCodeUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="mt-6 w-full">
              <div className="mb-2 text-sm text-gray-300">URL du formulaire :</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white/5 px-3 py-2 font-mono text-sm text-white backdrop-blur">
                  {qrCodeUrl}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="rounded-md bg-white/10 p-2 hover:bg-white/20"
                >
                  <Copy className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content with Cards */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid gap-8 md:grid-cols-2"
        >
          <div className="backdrop-blur-xl backdrop-filter rounded-xl border border-white/10 bg-white/5 p-8 text-white">
            <h2 className="mb-8 text-2xl font-semibold">Vol découverte inclus :</h2>
            <ul className="space-y-6">
              {features?.map((feature, index) => (
                <motion.li
                  key={feature.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 * index }}
                  className="flex items-center gap-3"
                >
                  <div className="rounded-full bg-gradient-to-r from-orange-400 to-orange-600 p-1">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <span className="text-lg">{feature.description}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="backdrop-blur-xl backdrop-filter rounded-xl border border-white/10 bg-white/5 p-8 text-white">
            <h3 className="mb-8 text-2xl font-semibold">Nous contacter</h3>
            <div className="space-y-6 text-gray-200">
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
          </div>
        </motion.div>
      </div>
    </div>
  )
}
