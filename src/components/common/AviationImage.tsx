import React from 'react';

interface AviationImageProps {
  imageName: string;
  className?: string;
  showPrompt?: boolean;
}

const AviationImage: React.FC<AviationImageProps> = ({ imageName, className = '', showPrompt = false }) => {
  // Liste des prompts pour chaque image
  const imagePrompts: { [key: string]: string } = {
    'login-1.png': 'Cessna 172 silhouetted against dramatic sunset sky, warm orange clouds, cinematic lighting --ar 2:1 --v 6',
    'login-2.png': 'Modern glass cockpit interior, blue sky through windscreen, golden hour lighting --ar 2:1 --v 6',
    'login-3.png': 'Light aircraft near snow-capped peaks, dramatic alpine landscape, morning light --ar 2:1 --v 6',
    'login-4.png': 'Small aircraft wing above fluffy clouds, pure blue sky, serene atmosphere --ar 2:1 --v 6',
    'login-5.png': 'Rural airport runway at dawn, morning dew, soft fog, peaceful atmosphere --ar 2:1 --v 6',
    'login-6.png': 'Flight training session, pre-flight check, professional atmosphere --ar 2:1 --v 6',
    'login-7.png': 'Aerial view of countryside airfield, geometric patterns, late afternoon --ar 2:1 --v 6',
    'login-8.png': 'ULM taking off from grass strip, dynamic angle, countryside scenery --ar 2:1 --v 6',
    'login-9.png': 'Aircraft maintenance in modern hangar, technical detail, clean environment --ar 2:1 --v 6',
    'login-10.png': 'Piper cub flying low over autumn forest, golden light, adventure mood --ar 2:1 --v 6',
    'login-11.png': 'Sunset landing approach, dramatic sky, runway lights beginning to glow --ar 2:1 --v 6'
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    img.src = 'https://placehold.co/1200x600/1a1d21/ffffff?text=Image+non+disponible';
  };

  return (
    <div className={`relative ${className}`}>
      <img
        src={`/assets/images/${imageName}`}
        alt="Aviation"
        onError={handleError}
        className="w-full h-full object-cover"
      />
      {showPrompt && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 text-sm font-mono">
          <p>Prompt: {imagePrompts[imageName] || 'Prompt non disponible'}</p>
        </div>
      )}
    </div>
  );
};

export default AviationImage;
