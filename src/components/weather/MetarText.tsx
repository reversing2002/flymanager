import React from 'react';

interface MetarTextProps {
  metar: string;
  compact?: boolean;
}

const MetarText: React.FC<MetarTextProps> = ({ metar, compact = false }) => {
  const formatWord = (word: string) => {
    // Visibilité faible (moins de 5000m)
    const visibilityMatch = word.match(/^(\d{4})$/);
    if (visibilityMatch && parseInt(visibilityMatch[1]) < 5000) {
      return 'text-red-600';
    }

    // Plafond bas (moins de 1500ft)
    const ceilingMatch = word.match(/^(BKN|OVC|VV)(\d{3})$/);
    if (ceilingMatch && parseInt(ceilingMatch[2]) < 150) {
      return 'text-red-600';
    }

    // Phénomènes météo significatifs
    if (['FZFG', 'BR', 'FG', '+RA', 'RA', 'RASN', 'SN', '-SN', '+SN'].includes(word)) {
      return 'text-orange-600';
    }

    // Rafales
    if (word.startsWith('G')) {
      return 'text-blue-600';
    }

    return '';
  };

  return (
    <div className={`font-mono ${compact ? 'text-xs' : 'text-sm'} text-slate-700 whitespace-pre-wrap break-words`}>
      {metar.split(' ').map((word, index) => {
        const colorClass = formatWord(word);
        return (
          <span key={index} className={colorClass}>
            {word}{' '}
          </span>
        );
      })}
    </div>
  );
};

export default MetarText;
