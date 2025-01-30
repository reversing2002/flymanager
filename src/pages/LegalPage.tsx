import React from 'react';
import { motion } from 'framer-motion';

const LegalPage = () => {
  return (
    <div className="min-h-screen bg-[#1a1d21] pt-20">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-8">Mentions Légales</h1>
            
            <div className="space-y-8">
              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Éditeur du site</h2>
                <div className="text-gray-300 space-y-2">
                  <p><strong>Société :</strong> MELBA CAPITAL</p>
                  <p><strong>Forme juridique :</strong> SASU (Société par actions simplifiée unipersonnelle)</p>
                  <p><strong>Siège social :</strong> 5 route de Cussieux, 42400 Saint Chamond</p>
                  <p><strong>SIREN :</strong> 840 514 913</p>
                  <p><strong>SIRET :</strong> 840 514 913 00010</p>
                  <p><strong>Numéro RCS :</strong> 840 514 913 R.C.S. Saint-Etienne</p>
                  <p><strong>Capital social :</strong> 2 700 000,00 €</p>
                  <p><strong>Numéro de TVA :</strong> FR69840514913</p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Hébergement</h2>
                <div className="text-gray-300 space-y-2">
                  <p><strong>Hébergeur :</strong> Amazon Web Services (AWS)</p>
                  <p><strong>Société :</strong> Amazon Web Services Inc.</p>
                  <p><strong>Adresse :</strong> 410 Terry Avenue North, Seattle, WA 98109-5210, USA</p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Protection des données personnelles</h2>
                <div className="text-gray-300 space-y-4">
                  <p>
                    Conformément à la loi Informatique et Libertés du 6 janvier 1978 modifiée, et au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
                  </p>
                  <p>
                    Pour exercer ces droits, vous pouvez nous contacter :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Par email : contact@4fly.io</li>
                    <li>Par courrier : MELBA CAPITAL, 5 route de Cussieux, 42400 Saint Chamond</li>
                  </ul>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Propriété intellectuelle</h2>
                <div className="text-gray-300 space-y-4">
                  <p>
                    L'ensemble du contenu de ce site (structure, textes, images, logos, base de données...) est la propriété exclusive de MELBA CAPITAL. Toute reproduction, représentation, modification, publication, transmission, dénaturation, totale ou partielle du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit est interdite sans l'autorisation écrite préalable de MELBA CAPITAL.
                  </p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Cookies</h2>
                <div className="text-gray-300 space-y-4">
                  <p>
                    Ce site utilise des cookies nécessaires à son bon fonctionnement. Un cookie est un petit fichier texte stocké sur votre ordinateur. Les cookies que nous utilisons ne permettent pas de vous identifier personnellement. Ils nous permettent simplement d'améliorer votre expérience utilisateur et de mesurer l'audience du site.
                  </p>
                  <p>
                    En utilisant notre site, vous acceptez l'utilisation des cookies conformément à notre politique de confidentialité.
                  </p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Liens hypertextes</h2>
                <div className="text-gray-300">
                  <p>
                    Le site 4fly.io peut contenir des liens vers d'autres sites. MELBA CAPITAL n'est pas responsable du contenu ou de la politique de confidentialité de ces sites.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LegalPage;
