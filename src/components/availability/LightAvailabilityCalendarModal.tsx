import React from 'react';
import { X } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';

interface LightAvailabilityCalendarModalProps {
  userId: string;
  onClose: () => void;
  userName: string;
}

const LightAvailabilityCalendarModal: React.FC<LightAvailabilityCalendarModalProps> = ({
  userId,
  onClose,
  userName,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />

        <div className="relative w-full max-w-4xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
            Planning - {userName}
          </h3>

          <div className="mt-4">
            <AvailabilityCalendar 
              userId={userId} 
              hideAddButton
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightAvailabilityCalendarModal;
