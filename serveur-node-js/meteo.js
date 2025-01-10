const express = require('express');
const axios = require('axios');
const moment = require('moment');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const TOKEN_URL = "https://portail-api.meteofrance.fr/token";
const API_URL = "https://public-api.meteofrance.fr/public/DPObs/v1";

// Initialisation du client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stockage des données de vent par club
let windDataByClub = new Map();

class MeteoClient {
    constructor() {
        this.session = axios.create();
        this.token = null;
        this.tokenExpirationTime = null;
        
        // Log pour vérifier la valeur de BASE64_CREDENTIALS
        console.log('BASE64_CREDENTIALS:', process.env.BASE64_CREDENTIALS ? 'présent' : 'manquant');
        
        if (!process.env.BASE64_CREDENTIALS) {
            console.error('BASE64_CREDENTIALS is not set in the .env file');
            throw new Error('BASE64_CREDENTIALS manquant dans les variables d\'environnement');
        }
    }

    async request(method, url, options = {}) {
        if (!this.token || this.isTokenExpired()) {
            await this.obtainToken();
        }

        try {
            const response = await this.session.request({
                method,
                url,
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`
                }
            });
            return response;
        } catch (error) {
            console.error('Erreur de requête:', error.message);
            if (error.response && error.response.status === 401) {
                console.log('Token expiré, obtention d\'un nouveau token...');
                await this.obtainToken();
                return await this.session.request({
                    method,
                    url,
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
            throw error;
        }
    }

    isTokenExpired() {
        return !this.tokenExpirationTime || moment().isAfter(this.tokenExpirationTime);
    }

    async obtainToken() {
        const data = 'grant_type=client_credentials';
        const headers = {
            'Authorization': `Basic ${process.env.BASE64_CREDENTIALS}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        try {
            console.log('Obtention d\'un nouveau token...');
            console.log('En-tête d\'autorisation:', headers.Authorization ? 'présent' : 'manquant');
            const response = await axios.post(TOKEN_URL, data, { headers });
            this.token = response.data.access_token;
            this.tokenExpirationTime = moment().add(1, 'hour');
            console.log('Nouveau token obtenu avec succès, valide jusqu\'à:', this.tokenExpirationTime.format());
        } catch (error) {
            console.error('Erreur lors de l\'obtention du token:', error.response?.data || error.message);
            if (error.response) {
                console.error('Réponse d\'erreur complète:', error.response);
            }
            throw error;
        }
    }

    async fetchWindData(stationId) {
        const formattedDate = moment().utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z';
        try {
            console.log(`Récupération des données de vent pour la station ${stationId}`);
            const response = await this.request('GET', `${API_URL}/station/infrahoraire-6m`, {
                params: {
                    id_station: stationId,
                    date: formattedDate,
                    format: 'json'
                }
            });

            const data = response.data;
            if (data && data.length > 0) {
                console.log(`${data.length} entrées de données reçues`);
                return data.map(entry => ({
                    time: entry.validity_time,
                    speed: Math.round(entry.ff * 3.6),
                    direction: entry.dd,
                    timestamp: moment()
                }));
            }
            console.log('Aucune donnée de vent reçue');
            return [];
        } catch (error) {
            console.error('Erreur lors de la récupération des données de vent:', error.message);
            if (error.response) {
                console.error('Statut de la réponse:', error.response.status);
                console.error('Données de la réponse:', error.response.data);
            }
            return [];
        }
    }
}

// Route pour obtenir les données de vent d'un club spécifique
router.get('/wind-data/:clubId', async (req, res) => {
    const { clubId } = req.params;
    console.log(`Requête reçue pour les données de vent du club ${clubId}`);
    
    try {
        // Récupérer la configuration de la balise du club
        const { data: clubData, error: clubError } = await supabase
            .from('clubs')
            .select('wind_station_id')
            .eq('id', clubId)
            .single();

        if (clubError) throw clubError;
        if (!clubData.wind_station_id) {
            return res.status(400).json({ 
                error: 'Aucune balise météo configurée pour ce club' 
            });
        }

        // Vérifier si nous avons déjà des données en cache pour ce club
        if (!windDataByClub.has(clubId)) {
            windDataByClub.set(clubId, []);
        }

        const windData = windDataByClub.get(clubId);
        
        // Si pas de données ou données trop anciennes, mettre à jour
        const lastUpdate = windData.length > 0 ? windData[windData.length - 1].timestamp : null;
        if (!lastUpdate || moment().diff(moment(lastUpdate), 'minutes') > 5) {
            const client = new MeteoClient();
            const newData = await client.fetchWindData(clubData.wind_station_id);
            windDataByClub.set(clubId, newData);
            return res.json(newData);
        }

        return res.json(windData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données de vent:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des données de vent' });
    }
});

// Fonction de mise à jour périodique des données pour tous les clubs
async function updateAllClubsWindData() {
    try {
        // Récupérer tous les clubs avec une balise configurée
        const { data: clubs, error } = await supabase
            .from('clubs')
            .select('id, wind_station_id')
            .not('wind_station_id', 'is', null);

        if (error) throw error;

        // Mettre à jour les données pour chaque club
        const client = new MeteoClient();
        for (const club of clubs) {
            try {
                const newData = await client.fetchWindData(club.wind_station_id);
                windDataByClub.set(club.id, newData);
            } catch (clubError) {
                console.error(`Erreur lors de la mise à jour des données pour le club ${club.id}:`, clubError);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour des données de vent:', error);
    }
}

// Mettre à jour les données toutes les 5 minutes
setInterval(updateAllClubsWindData, 5 * 60 * 1000);

// Charger les données initiales au démarrage
updateAllClubsWindData();

module.exports = router;
