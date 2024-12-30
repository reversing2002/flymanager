import React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TafVisualizerProps {
  rawTaf: string;
  compact?: boolean;
}

const TafVisualizer: React.FC<TafVisualizerProps> = ({ rawTaf, compact = false }) => {
  if (!rawTaf) return null;

  // Extraire la date et l'heure de validité du TAF
  const tafMatch = rawTaf.match(/TAF.*?(\d{2})(\d{2})(\d{2})Z\s+(\d{2})(\d{2})\/(\d{2})(\d{2})/);
  
  if (!tafMatch) return null;

  const [_, day, hour, min, validFromDay, validFromHour, validToDay, validToHour] = tafMatch;
  
  // Construire les dates de validité
  const now = new Date();
  const validFrom = new Date(now.getFullYear(), now.getMonth(), parseInt(validFromDay), parseInt(validFromHour));
  const validTo = new Date(now.getFullYear(), now.getMonth(), parseInt(validToDay), parseInt(validToHour));

  // Si le jour de fin est inférieur au jour de début, c'est que ça passe au mois suivant
  if (validTo < validFrom) {
    validTo.setMonth(validTo.getMonth() + 1);
  }

  return (
    <div className={compact ? "" : "mt-4 pt-4 border-t border-slate-100"}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-600">
          Valide du {format(validFrom, "d MMMM 'à' HH'h'", { locale: fr })} au {format(validTo, "d MMMM 'à' HH'h'", { locale: fr })}
        </span>
      </div>
      <div className={`font-mono ${compact ? "text-xs" : "text-sm"} text-slate-700 whitespace-pre-wrap break-words`}>
        {rawTaf.split(' ').map((word, index) => {
          // Mettre en évidence les mots clés importants
          if (['BECMG', 'TEMPO', 'PROB30', 'PROB40', 'FM', 'NOSIG'].includes(word)) {
            return <span key={index} className="text-blue-600 font-semibold">{word} </span>;
          }

          // Visibilité faible (moins de 5000m)
          const visibilityMatch = word.match(/^(\d{4})$/);
          if (visibilityMatch && parseInt(visibilityMatch[1]) < 5000) {
            return <span key={index} className="text-red-600">{word} </span>;
          }

          // Plafond bas (moins de 1500ft)
          const ceilingMatch = word.match(/^(BKN|OVC|VV)(\d{3})$/);
          if (ceilingMatch && parseInt(ceilingMatch[2]) < 150) {
            return <span key={index} className="text-red-600">{word} </span>;
          }

          // Mettre en évidence les conditions météo significatives
          if (['FZFG', 'BR', 'FG', '+RA', 'RA', 'RASN', 'SN', '-SN', '+SN', 'NSW'].includes(word)) {
            return <span key={index} className="text-orange-600">{word} </span>;
          }

          // Rafales
          if (word.startsWith('G')) {
            return <span key={index} className="text-blue-600">{word} </span>;
          }

          return <span key={index}>{word} </span>;
        })}
      </div>
    </div>
  );
};

export default TafVisualizer;
