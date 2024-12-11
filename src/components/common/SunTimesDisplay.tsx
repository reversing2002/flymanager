import { Sun } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import SunCalc from "suncalc";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  aeroStart: Date;
  aeroEnd: Date;
}

interface SunTimesDisplayProps {
  date: Date;
  className?: string;
}

export default function SunTimesDisplay({ date, className }: SunTimesDisplayProps) {
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadSunTimes = async () => {
      if (!user?.club?.id) return;

      const { data: clubData } = await supabase
        .from('clubs')
        .select('latitude, longitude')
        .eq('id', user.club.id)
        .single();

      if (clubData?.latitude && clubData?.longitude) {
        const times = SunCalc.getTimes(date, clubData.latitude, clubData.longitude);
        const aeroStart = new Date(times.sunrise);
        const aeroEnd = new Date(times.sunset);
        
        // La journée aéronautique commence 30 minutes avant le lever du soleil
        aeroStart.setMinutes(aeroStart.getMinutes() - 30);
        // Et se termine 30 minutes après le coucher du soleil
        aeroEnd.setMinutes(aeroEnd.getMinutes() + 30);

        setSunTimes({
          sunrise: times.sunrise,
          sunset: times.sunset,
          aeroStart,
          aeroEnd
        });
      }
    };

    loadSunTimes();
  }, [user?.club?.id, date]);

  if (!sunTimes) return null;

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
