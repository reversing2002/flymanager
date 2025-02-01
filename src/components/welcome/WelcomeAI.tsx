import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  TextareaAutosize,
  IconButton,
  Avatar,
  CircularProgress,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Fade,
  Modal,
  GlobalStyles,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Editor } from '@monaco-editor/react';
import ImportValidationBox from './ImportValidationBox';
import { useNavigate } from 'react-router-dom';
import { resetClubData } from '../../lib/queries/dataReset';
import JsonEditorModal from '../progression/admin/JsonEditorModal';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChatIcon from '@mui/icons-material/Chat';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  config?: any;
}

interface WeatherStation {
  Id_station: string;
  Id_omm: string;
  Nom_usuel: string;
  Latitude: number;
  Longitude: number;
  Altitude: number;
  Date_ouverture: string;
  Pack: string;
  distance?: number;
}

export interface ClubConfig {
  aircrafts?: any[];
  members?: any[];
  settings?: any;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  weatherStation?: WeatherStation;
  [key: string]: any;
}

const ConfigEditor = ({ config, onChange }: { config: Partial<ClubConfig>; onChange: (newConfig: Partial<ClubConfig>) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editorValue, setEditorValue] = useState('');

  useEffect(() => {
    setEditorValue(JSON.stringify(config, null, 2));
  }, [config]);

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    setEditorValue(value);
    try {
      const newConfig = JSON.parse(value);
      onChange(newConfig);
    } catch (error) {
      // Ne met pas à jour la config si le JSON est invalide
      console.error('JSON invalide:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        <span>Configuration JSON</span>
        <span className="text-xl transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Editor
            height="300px"
            defaultLanguage="json"
            value={editorValue}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'off',
              folding: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      )}
    </div>
  );
};

interface JsonConfigModalProps {
  open: boolean;
  onClose: () => void;
  config: any;
}

const JsonConfigModal: React.FC<JsonConfigModalProps> = ({ open, onClose, config }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Fade }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: '600px' },
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            maxHeight: '80vh',
            overflow: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Configuration OpenAI
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ height: '400px', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={JSON.stringify(config, null, 2)}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
                theme: 'vs-dark',
              }}
            />
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

const WelcomeAI = () => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [clubConfig, setClubConfig] = useState<Partial<ClubConfig>>({});
  const [configComplete, setConfigComplete] = useState(false);
  const [showConfigBanner, setShowConfigBanner] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyStations, setNearbyStations] = useState<WeatherStation[]>([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [weatherDataLoaded, setWeatherDataLoaded] = useState(false);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [conversationConfig, setConversationConfig] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL;

  // Fonction pour nettoyer le contenu des balises config
  const cleanConfigFromMessage = (content: string) => {
    return content.replace(/<config>[\s\S]*?<\/config>/g, '');
  };

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Demander la géolocalisation au chargement du composant
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setClubConfig(prev => ({
            ...prev,
            coordinates: {
              latitude,
              longitude,
            }
          }));

          // Informer l'assistant de la localisation
          const locationMessage = `J'ai automatiquement détecté votre position : Latitude ${latitude.toFixed(6)}, Longitude ${longitude.toFixed(6)}. Je vais utiliser ces coordonnées pour configurer votre club.`;
          
          //handleAssistantMessage(locationMessage);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          let errorMessage = 'Impossible de récupérer votre position. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Vous avez refusé l\'accès à votre position.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Les informations de position ne sont pas disponibles.';
              break;
            case error.TIMEOUT:
              errorMessage += 'La demande de position a expiré.';
              break;
            default:
              errorMessage += 'Une erreur inconnue est survenue.';
          }
          setLocationError(errorMessage);
          handleAssistantMessage('Je vois que je ne peux pas accéder à votre position. Pourriez-vous me donner les coordonnées de votre club manuellement ?');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur.');
      handleAssistantMessage('Votre navigateur ne supporte pas la géolocalisation. Pourriez-vous me donner les coordonnées de votre club manuellement ?');
    }
  }, []);

  useEffect(() => {
    // Démarrer la conversation une fois que toutes les données sont prêtes
    const shouldStartConversation = session?.access_token && 
      !conversationStarted && 
      (weatherDataLoaded || locationError);

    if (shouldStartConversation) {
      startConversation();
      setConversationStarted(true);
    }
  }, [session, weatherDataLoaded, locationError, conversationStarted]);

  useEffect(() => {
    // Charger les données météo quand la localisation est disponible
    const loadWeatherData = async () => {
      if (clubConfig.coordinates) {
        try {
          // Simuler le chargement des données météo
          // Remplacer par votre véritable appel API météo
          await new Promise(resolve => setTimeout(resolve, 1000));
          setWeatherDataLoaded(true);
        } catch (error) {
          console.error('Erreur lors du chargement des données météo:', error);
          setWeatherDataLoaded(true); // On continue même en cas d'erreur
        }
      }
    };

    if (clubConfig.coordinates && !weatherDataLoaded) {
      loadWeatherData();
    }
  }, [clubConfig.coordinates]);

  useEffect(() => {
    // Vérifier la validité de la configuration côté client
    const checkConfigValid = () => {
      if (!clubConfig) return false;
      
      // Vérifier la présence d'au moins un avion
      const hasAircrafts = clubConfig.aircrafts && clubConfig.aircrafts.length > 0;
      
      // Vérifier la présence d'au moins un membre (hors admin déjà connecté)
      const hasMembers = clubConfig.members && clubConfig.members.length > 0;
      
      return hasAircrafts && hasMembers;
    };

    setConfigComplete(checkConfigValid());
  }, [clubConfig]);

  const startConversation = async () => {
    try {
      console.log('🔑 Session:', session);
      if (!session?.access_token || !session.user) {
        console.log('❌ Pas de token ou utilisateur trouvé');
        return;
      }

      // Récupérer les informations complètes de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          club_members!inner(
            club:clubs(
              id,
              name,
              code,
              address,
              phone,
              email,
              latitude,
              longitude,
              night_flights_enabled,
              commission_rate,
              stripe_account_id,
              wind_station_id,
              wind_station_name
            )
          )
        `)
        .eq('auth_id', session.user.id)
        .single();

      if (userError) {
        console.error('❌ Erreur lors de la récupération des données utilisateur:', userError);
        return;
      }

      if (!userData?.club_members?.[0]?.club) {
        console.log('❌ Pas de club associé à l\'utilisateur');
        return;
      }

      const clubData = userData.club_members[0].club;
      console.log('📊 Données du club:', clubData);

      // Récupérer les avions existants
      const { data: existingAircraft, error: aircraftError } = await supabase
        .from('aircraft')
        .select('*')
        .eq('club_id', clubData.id);

      if (aircraftError) {
        console.error('Erreur lors de la récupération des avions:', aircraftError);
      }

      // Récupérer les membres existants
      const { data: existingMembers, error: membersError } = await supabase
        .from('users')  // Correction du nom de la table
        .select('*');  // La politique RLS filtre déjà les utilisateurs du club

      if (membersError) {
        console.error('Erreur lors de la récupération des membres:', membersError);
      }

      // Formater les données existantes pour l'API
      const existingData = {
        aircrafts: existingAircraft?.map(aircraft => ({
          type: aircraft.type,
          registration: aircraft.registration,
          hourlyRate: aircraft.hourly_rate,
          capacity: aircraft.capacity || (aircraft.type === 'PLANE' ? 4 : 2), // 4 places pour avion, 2 pour ULM
          status: 'AVAILABLE',
          hour_format: 'CLASSIC'
        })) || [],
        members: existingMembers?.map(member => ({
          role: member.role,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email
        })) || []
      };
      
      const requestBody = {
        clubConfig: {
          club: {
            id: clubData.id,
            name: clubData.name,
            oaci: clubData.code,
            contact: {
              admin: {
                firstName: userData.first_name,
                lastName: userData.last_name,
                email: userData.email
              }
            },
            address: clubData.address,
            coordinates: {
              latitude: clubData.latitude,
              longitude: clubData.longitude,
              browser: clubConfig.coordinates ? {
                latitude: clubConfig.coordinates.latitude,
                longitude: clubConfig.coordinates.longitude,
              } : undefined
            },
            settings: {
              language: "fr",
              timezone: "Europe/Paris",
              currency: "EUR",
              nightFlightsEnabled: clubData.night_flights_enabled,
              commissionRate: clubData.commission_rate,
              weatherStation: {
                id: clubData.wind_station_id,
                name: clubData.wind_station_name
              }
            },
            features: {
              booking: true,
              maintenance: true,
              training: true,
              billing: true,
              weather: true,
              notam: true
            },
            modules: {
              stripe: true,
              mailjet: true,
              weather: true,
              notam: true
            }
          },
          existingData // Ajouter les données existantes
        }
      };
      
      console.log('📤 Envoi de la configuration à Claude:', requestBody);
      
      setIsTyping(true);
      const response = await fetch(`${apiUrl}/api/openai/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Réponse du serveur:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur serveur:', errorData);
        throw new Error(errorData.details || 'Erreur lors du démarrage de la conversation');
      }

      const data = await response.json();
      console.log('✅ Données reçues:', data);
      setMessages([{
        id: data.messageId,
        role: 'assistant',
        content: cleanConfigFromMessage(data.content),
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors du démarrage de la conversation');
    } finally {
      setIsTyping(false);
    }
  };

  const extractConfigFromMessage = (content: string): any | null => {
    const configMatch = content.match(/<config>([\s\S]*?)<\/config>/);
    if (configMatch && configMatch[1]) {
      try {
        return JSON.parse(configMatch[1]);
      } catch (error) {
        console.error('Erreur lors du parsing de la configuration:', error);
        return null;
      }
    }
    return null;
  };

  const handleAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: cleanConfigFromMessage(content),
      timestamp: new Date(),
    };

    // Extraire la configuration si présente
    const config = extractConfigFromMessage(content);
    if (config) {
      newMessage.config = config;
      setConversationConfig(prev => [...prev, config]);
      
      // Mettre à jour clubConfig avec les nouvelles données
      setClubConfig(prevConfig => ({
        ...prevConfig,
        ...config,
      }));
    }

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !session?.access_token) return;

    const userMessage = input;
    setInput('');

    // Ajouter le message de l'utilisateur
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    try {
      setIsTyping(true);
      const response = await fetch(`${apiUrl}/api/openai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Erreur lors de la conversation');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: data.messageId,
        role: 'assistant',
        content: cleanConfigFromMessage(data.content),
        timestamp: new Date(),
      }]);

      if (data.config) {
        setClubConfig(data.config);
      }

      setConfigComplete(data.isComplete);

    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la conversation');
    } finally {
      setIsTyping(false);
    }
  };

  const handleImport = async () => {
    try {
      console.log('Début de l\'import');
      console.log('User:', user);
      console.log('Club config:', clubConfig);

      if (!user?.club?.id) {
        throw new Error("Club ID non trouvé");
      }

      // Réinitialiser les données du club avant l'import
      console.log('Réinitialisation des données du club...');
      await resetClubData(user.club.id, user.id);
      console.log('Réinitialisation terminée');

      // Préparation des données des avions
      const aircraftData = clubConfig.aircrafts?.map(aircraft => {
        const formattedAircraft = {
          club_id: user.club.id,
          name: aircraft.type, // Utiliser le type comme nom si pas de nom spécifié
          type: aircraft.type,
          registration: aircraft.registration,
          hourly_rate: Number(aircraft.hourlyRate),
          capacity: aircraft.capacity || (aircraft.type === 'PLANE' ? 4 : 2), // 4 places pour avion, 2 pour ULM
          status: aircraft.status || 'AVAILABLE', // Utiliser le statut du JSON ou 'AVAILABLE' par défaut
          hour_format: 'CLASSIC',
          has_hour_meter: aircraft.has_hour_meter ?? true // Par défaut true pour la rétrocompatibilité
        };
        console.log('Aircraft data:', formattedAircraft);
        return formattedAircraft;
      });

      // Préparation des données des membres
      const memberData = clubConfig.members?.map(member => {
        const formattedMember = {
          id: crypto.randomUUID(),
          first_name: member.firstName,
          last_name: member.lastName,
          email: member.email,
          login: member.email // Utiliser l'email comme login par défaut
        };
        console.log('Member data:', formattedMember);
        return { ...formattedMember, role: member.role }; // On garde le rôle pour plus tard
      });

      console.log('Données préparées :', { aircraftData, memberData });

      // Import des avions
      if (aircraftData && aircraftData.length > 0) {
        console.log('Import des avions...');
        
        for (const aircraft of aircraftData) {
          // Vérifier si l'avion existe déjà
          const { data: existingAircraft, error: findError } = await supabase
            .from('aircraft')
            .select('id')
            .eq('registration', aircraft.registration)
            .eq('club_id', user.club.id)
            .maybeSingle();

          if (findError) {
            console.error('Erreur lors de la recherche de l\'avion:', findError);
            continue;
          }

          if (existingAircraft) {
            // Mise à jour de l'avion existant
            const { error: updateError } = await supabase
              .from('aircraft')
              .update(aircraft)
              .eq('id', existingAircraft.id);

            if (updateError) {
              console.error('Erreur lors de la mise à jour de l\'avion:', updateError);
            } else {
              console.log('Avion mis à jour:', aircraft.registration);
            }
          } else {
            // Création d'un nouvel avion
            const { error: insertError } = await supabase
              .from('aircraft')
              .insert(aircraft);

            if (insertError) {
              console.error('Erreur lors de la création de l\'avion:', insertError);
            } else {
              console.log('Nouvel avion créé:', aircraft.registration);
            }
          }
        }
      }

      // Import des membres
      if (memberData && memberData.length > 0) {
        console.log('Import des membres...');
        
        for (const member of memberData) {
          try {
            // Utiliser la fonction RPC create_member
            const { data: newMember, error: createError } = await supabase.rpc(
              'create_member',
              {
                p_club_id: user.club.id,
                p_first_name: member.first_name,
                p_last_name: member.last_name,
                p_email: member.email,
                p_login: member.email,
                p_role: member.role
              }
            );

            if (createError) {
              console.error('Erreur lors de la création du membre:', createError);
              continue;
            }

            console.log('Nouveau membre créé:', member.email);
          } catch (error) {
            console.error('Erreur lors du traitement du membre:', error);
          }
        }
      }

      toast.success('Import réussi ! Redirection vers le tableau de bord...');
      
      // Redirection vers le dashboard après un court délai
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Erreur détaillée lors de l\'import:', error);
      toast.error(error.message || 'Erreur lors de l\'import des données');
    }
  };

  const applyConfig = async () => {
    try {
      if (!user?.club?.id) throw new Error("Club ID non trouvé");

      // Insérer les avions
      if (clubConfig.aircrafts?.length) {
        const aircraftWithClubId = clubConfig.aircrafts.map(aircraft => ({
          ...aircraft,
          club_id: user.club.id,
          status: aircraft.status || 'AVAILABLE', // Utiliser le statut du JSON ou 'AVAILABLE' par défaut
          has_hour_meter: aircraft.has_hour_meter ?? true // Par défaut true pour la rétrocompatibilité
        }));
        await supabase.from('aircraft').insert(aircraftWithClubId);
      }

      // Insérer les membres
      if (clubConfig.members?.length) {
        for (const member of clubConfig.members) {
          try {
            // 1. Créer l'utilisateur dans public.users
            const { data: newUser, error: userError } = await supabase
              .from('users')
              .insert({
                id: crypto.randomUUID(),
                ...member,
                status: 'ACTIVE'
              })
              .select()
              .single();

            if (userError) throw userError;

            // 2. Créer la relation club_member
            if (newUser) {
              const { error: memberError } = await supabase
                .from('club_members')
                .insert({
                  user_id: newUser.id,
                  club_id: user.club.id
                });

              if (memberError) throw memberError;
            }
          } catch (error) {
            console.error('Erreur lors de la création du membre:', error);
            throw error;
          }
        }
      }

      // Mettre à jour les paramètres
      if (clubConfig.settings) {
        await supabase
          .from('club_settings')
          .upsert({
            club_id: user.club.id,
            ...clubConfig.settings,
          });
      }

      toast.success('Configuration appliquée avec succès !');
      
      // Rediriger vers le dashboard après un court délai
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de l\'application de la configuration:', error);
      toast.error('Erreur lors de l\'application de la configuration');
    }
  };

  const fetchNearbyStations = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(`https://stripe.linked.fr/api/meteo/stations?latitude=${latitude}&longitude=${longitude}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des stations météo');
      }
      const stations: WeatherStation[] = await response.json();
      
      setNearbyStations(stations);

      // Sélectionner automatiquement la station la plus proche (déjà triée par l'API)
      if (stations.length > 0) {
        const closestStation = stations[0];
        setClubConfig(prev => ({
          ...prev,
          weatherStation: closestStation
        }));

        // Informer l'utilisateur de la station sélectionnée
        const stationMessage = `J'ai trouvé ${stations.length} stations météo à proximité. 

La station la plus proche est "${closestStation.Nom_usuel}" à ${closestStation.distance?.toFixed(1)} km de votre position.
Altitude: ${closestStation.Altitude}m
Type: ${closestStation.Pack}
En service depuis: ${new Date(closestStation.Date_ouverture).toLocaleDateString('fr-FR')}

Voulez-vous utiliser cette station pour votre club ? Si vous préférez, voici les autres stations disponibles :
${stations.slice(1).map(s => 
  `- ${s.Nom_usuel} (${s.distance?.toFixed(1)} km, altitude: ${s.Altitude}m, type: ${s.Pack})`
).join('\n')}`;

        //handleAssistantMessage(stationMessage);
      } else {
        //handleAssistantMessage("Je n'ai trouvé aucune station météo à proximité de votre position. Nous devrons peut-être élargir la zone de recherche.");
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des stations:', error);
      //handleAssistantMessage("Désolé, je n'ai pas pu récupérer la liste des stations météo. Nous pouvons réessayer plus tard ou configurer manuellement.");
    }
  };

  // Fonction utilitaire pour calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    // Demander la géolocalisation au chargement du composant
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setClubConfig(prev => ({
            ...prev,
            coordinates: {
              latitude,
              longitude,
            }
          }));

          // Informer l'assistant de la localisation
          //handleAssistantMessage(`J'ai détecté votre position. Je recherche les stations météo à proximité...`);
          
          // Récupérer les stations météo proches
          await fetchNearbyStations(latitude, longitude);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          let errorMessage = 'Impossible de récupérer votre position. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Vous avez refusé l\'accès à votre position.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Les informations de position ne sont pas disponibles.';
              break;
            case error.TIMEOUT:
              errorMessage += 'La demande de position a expiré.';
              break;
            default:
              errorMessage += 'Une erreur inconnue est survenue.';
          }
          setLocationError(errorMessage);
          //handleAssistantMessage('Je vois que je ne peux pas accéder à votre position. Pourriez-vous me donner les coordonnées de votre club manuellement ?');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur.');
      //handleAssistantMessage('Votre navigateur ne supporte pas la géolocalisation. Pourriez-vous me donner les coordonnées de votre club manuellement ?');
    }
  }, []);

  const handleOpenConfigModal = () => {
    setIsConfigModalOpen(true);
  };

  return (
    <>
      <GlobalStyles
        styles={{
          'body': {
            backgroundColor: '#1E1E1E !important',
          },
          '#root': {
            backgroundColor: '#1E1E1E !important',
          },
          '.MuiContainer-root': {
            backgroundColor: '#1E1E1E !important',
          },
          'main': {
            backgroundColor: '#1E1E1E !important',
          }
        }}
      />
      <Box
        sx={{
          height: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#1E1E1E',
          position: 'relative',
          width: { xs: '100%', sm: 'calc(100% - 64px)' },
          marginLeft: { xs: 0, sm: '64px' },
          marginTop: '80px',
          overflow: 'hidden',
        }}
      >
        {/* Bannière de configuration */}
        {configComplete && showConfigBanner && (
          <Paper
            elevation={0}
            sx={{
              bgcolor: '#22C55E',
              p: { xs: 2, sm: 3 },
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              borderRadius: 0,
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckIcon sx={{ color: '#FFFFFF' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                  Configuration terminée !
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFFFFF', opacity: 0.9 }}>
                  Vous pouvez créer votre club maintenant ou continuer la conversation pour ajouter des éléments
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="outlined"
                onClick={() => {
                  // Fermer la bannière et focus sur la zone de saisie
                  setShowConfigBanner(false);
                  inputRef.current?.focus();
                }}
                size="large"
                sx={{
                  flex: { xs: 1, sm: 'none' },
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: '#FFFFFF',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
                startIcon={<ChatIcon />}
              >
                Continuer la conversation
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                size="large"
                sx={{
                  flex: { xs: 1, sm: 'none' },
                  bgcolor: '#FFFFFF',
                  color: '#22C55E',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
                endIcon={<ArrowForwardIcon />}
              >
                Commencer à utiliser 4Fly
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Zone des messages */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: message.role === 'assistant' ? '#2D2D2D' : '#383838',
                    maxWidth: { xs: '90%', sm: '80%' },
                    ml: message.role === 'assistant' ? 0 : 'auto',
                    mr: message.role === 'assistant' ? 'auto' : 0,
                    overflow: 'hidden',
                    borderRadius: 2,
                    position: 'relative',
                  }}
                >
                  <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      {message.role === 'assistant' ? (
                        <Avatar
                          sx={{
                            bgcolor: '#5C5C5C',
                            width: 32,
                            height: 32,
                          }}
                        >
                          <SmartToyIcon fontSize="small" />
                        </Avatar>
                      ) : (
                        <Avatar
                          sx={{
                            bgcolor: '#4A4A4A',
                            width: 32,
                            height: 32,
                          }}
                        >
                          <PersonIcon fontSize="small" />
                        </Avatar>
                      )}
                      <Typography
                        variant="subtitle2"
                        sx={{ color: '#FFFFFF', opacity: 0.9 }}
                      >
                        {message.role === 'assistant' ? 'Assistant' : 'Vous'}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#FFFFFF',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                      }}
                    >
                      {message.content.split('\n').map((line, lineIndex) => {
                        // Traiter les lignes qui commencent par ###
                        if (line.startsWith('###')) {
                          return (
                            <>
                              {lineIndex > 0 && <span style={{ display: 'block', height: '1em' }} />}
                              <span style={{ display: 'block', textDecoration: 'underline' }}>
                                {line.replace(/^###\s*/, '')}
                              </span>
                            </>
                          );
                        }
                        
                        // Traiter le texte en gras
                        return (
                          <span key={lineIndex} style={{ display: 'block' }}>
                            {line.split(/(\*\*.*?\*\*)/).map((part, index) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={index}>{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </span>
                        );
                      })}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 2,
                        display: 'block',
                        textAlign: message.role === 'assistant' ? 'left' : 'right',
                        color: '#FFFFFF',
                        opacity: 0.5,
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#2D2D2D',
                }}
              >
                <CircularProgress size={20} sx={{ color: '#FFFFFF' }} />
                <Typography variant="body2" sx={{ color: '#FFFFFF', opacity: 0.7 }}>
                  Assistant en train d'écrire...
                </Typography>
              </Box>
            </motion.div>
          )}

          {configComplete && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 4,
                }}
              >
                <Button
                  variant="contained"
                  onClick={handleImport}
                  sx={{
                    ml: 2,
                    borderRadius: '16px',
                    bgcolor: '#22C55E',
                    color: '#FFFFFF',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: '#16A34A',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  Créer mon club
                </Button>
              </Box>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Zone de saisie */}
        <Paper
          elevation={0}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            bgcolor: '#2D2D2D',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1.5, 
              alignItems: 'flex-end', 
              maxWidth: 'lg', 
              mx: 'auto',
              position: 'relative',
            }}
          >
            <TextareaAutosize
              ref={inputRef}
              aria-label="Message à l'assistant"
              placeholder="Écrivez votre message ici..."
              minRows={1}
              maxRows={4}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                try {
                  JSON.parse(e.target.value);
                  setJsonContent(e.target.value);
                } catch {}
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              style={{
                width: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                padding: '12px',
                paddingRight: '48px',
                backgroundColor: '#383838',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '16px',
                lineHeight: '1.5',
                fontFamily: 'inherit',
              }}
            />
            <IconButton
              type="submit"
              disabled={!input.trim() || isTyping}
              sx={{
                position: 'absolute',
                right: '8px',
                bottom: '8px',
                bgcolor: input.trim() ? '#22C55E' : 'transparent',
                color: input.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  bgcolor: input.trim() ? '#16A34A' : 'rgba(255, 255, 255, 0.1)',
                },
                transition: 'all 0.2s ease-in-out',
                width: '36px',
                height: '36px',
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </>
  );
};

export default WelcomeAI;
