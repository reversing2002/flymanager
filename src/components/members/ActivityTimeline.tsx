import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plane, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Activity {
  id: string;
  type: 'flight' | 'payment' | 'reservation';
  title: string;
  description: string;
  date: string;
  metadata?: Record<string, string>;
}

interface ActivityTimelineProps {
  userId: string;
  extended?: boolean;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ userId, extended = false }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        // Get flights
        const { data: flights } = await supabase
          .from('flights')
          .select(`
            id,
            date,
            duration,
            aircraft:aircraft_id(registration),
            flight_type:flight_type_id(name)
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(extended ? 10 : 5);

        // Transform flights into activities
        const flightActivities = flights?.map(flight => ({
          id: flight.id,
          type: 'flight' as const,
          title: flight.flight_type.name,
          description: `Vol de ${flight.duration} minutes sur ${flight.aircraft.registration}`,
          date: flight.date,
          metadata: {
            duration: `${Math.floor(flight.duration / 60)}h${flight.duration % 60}`,
            aircraft: flight.aircraft.registration
          }
        })) || [];

        setActivities(flightActivities);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [userId, extended]);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-5 w-5" />;
      case 'payment':
        return <CreditCard className="h-5 w-5" />;
      case 'reservation':
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'flight':
        return 'text-sky-600 bg-sky-100';
      case 'payment':
        return 'text-emerald-600 bg-emerald-100';
      case 'reservation':
        return 'text-purple-600 bg-purple-100';
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, idx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {idx !== activities.length - 1 && (
                <span
                  className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-start space-x-3">
                <div className={`relative p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {activity.title}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {format(new Date(activity.date), 'PPP à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <p>{activity.description}</p>
                    {activity.metadata && (
                      <div className="mt-2 text-sm text-slate-500">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 mr-2"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityTimeline;