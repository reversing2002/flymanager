import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "../../lib/utils";
import { useState, useEffect } from "react";

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  aeroStart: Date;
  aeroEnd: Date;
}

interface SunTimesDisplayProps {
  sunTimes: SunTimes | null;
  className?: string;
  variant?: 'default' | 'compact';
  pilotName?: string;
}

export default function SunTimesDisplay({ sunTimes, className, variant = 'default', pilotName }: SunTimesDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!sunTimes) return null;

  const now = currentTime;
  const isDayTime = now >= sunTimes.aeroStart && now <= sunTimes.sunset;
  const isAeroTime = now >= sunTimes.aeroStart && now <= sunTimes.aeroEnd;
  
  // Calculer le pourcentage de la journée écoulé
  const dayProgress = (() => {
    const total = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();
    const current = now.getTime() - sunTimes.sunrise.getTime();
    return Math.max(0, Math.min(100, (current / total) * 100));
  })();

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      return `Bonjour ${pilotName || ''}`;
    } else if (hour >= 12 && hour < 18) {
      return `Bon après-midi ${pilotName || ''}`;
    } else {
      return `Bonsoir ${pilotName || ''}`;
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex flex-col sm:flex-row gap-1 sm:gap-4 text-sm",
        className
      )}>
        <div className="flex items-center gap-1">
          <Sun className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">
            {format(sunTimes.sunrise, 'HH:mm')} - {format(sunTimes.sunset, 'HH:mm')}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-80">
          <span className="whitespace-nowrap text-xs">
            Aéro: {format(sunTimes.aeroStart, 'HH:mm')} - {format(sunTimes.aeroEnd, 'HH:mm')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden",
      isDayTime ? "bg-gradient-to-r from-sky-100 to-blue-50" : "bg-gradient-to-r from-slate-900 to-blue-900",
      "rounded-xl p-4 sm:p-6 shadow-sm border",
      isDayTime ? "border-sky-100" : "border-slate-800",
      className
    )}>
      {/* Progress bar */}
      {isDayTime && (
        <div className="absolute bottom-0 left-0 h-1 bg-sky-100 w-full">
          <div 
            className="h-full bg-sky-500"
            style={{ width: `${dayProgress}%` }}
          />
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Icône et état actuel */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isAeroTime ? "bg-sky-100 text-sky-700" : "bg-slate-800 text-slate-200"
          )}>
            {isAeroTime ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </div>
          <div>
            <h3 className={cn(
              "font-medium",
              isAeroTime ? "text-sky-900" : "text-white"
            )}>
              {pilotName ? getGreeting() : isAeroTime ? "Jour aéronautique" : "Nuit aéronautique"}
            </h3>
            <p className={cn(
              "text-sm",
              isAeroTime ? "text-sky-700" : "text-slate-300"
            )}>
              {format(currentTime, "dd MMMM yyyy HH:mm:ss", { locale: fr })}
            </p>
          </div>
        </div>

        {/* Horaires */}
        <div className="flex gap-6 items-center">
          <div className={cn(
            "flex flex-col items-center",
            isAeroTime ? "text-sky-900" : "text-white"
          )}>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sunrise className="w-4 h-4" />
              <span>Lever</span>
            </div>
            <time className="text-lg font-semibold">{format(sunTimes.sunrise, 'HH:mm')}</time>
            <time className="text-xs opacity-75">Aéro: {format(sunTimes.aeroStart, 'HH:mm')}</time>
          </div>

          <div className={cn(
            "flex flex-col items-center",
            isAeroTime ? "text-sky-900" : "text-white"
          )}>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sunset className="w-4 h-4" />
              <span>Coucher</span>
            </div>
            <time className="text-lg font-semibold">{format(sunTimes.sunset, 'HH:mm')}</time>
            <time className="text-xs opacity-75">Aéro: {format(sunTimes.aeroEnd, 'HH:mm')}</time>
          </div>
        </div>
      </div>
    </div>
  );
}
