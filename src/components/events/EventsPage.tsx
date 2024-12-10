import React from 'react';
import { Calendar } from 'lucide-react';
import EventCalendar from './EventCalendar';

const EventsPage = () => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Événements</h1>
          <p className="text-slate-600">Calendrier des activités du club</p>
        </div>
      </div>

      <EventCalendar />
    </div>
  );
};

export default EventsPage;