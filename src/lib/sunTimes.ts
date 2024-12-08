import { addMinutes, subMinutes } from "date-fns";
import { getTimes } from "suncalc";

export const getSunTimes = (date: Date, latitude: number, longitude: number) => {
  // Utiliser la même date mais à midi pour éviter les problèmes de timezone
  const noonDate = new Date(date);
  noonDate.setHours(12, 0, 0, 0);
  
  const times = getTimes(noonDate, latitude, longitude);

  // Ajouter 30 minutes après le coucher du soleil et soustraire 30 minutes avant le lever
  const aeroStart = subMinutes(times.sunrise, 30);
  const aeroEnd = addMinutes(times.sunset, 30);

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    aeroStart,
    aeroEnd,
  };
};
