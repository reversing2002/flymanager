import React from 'react';
import { X } from 'lucide-react';
import DiscoveryFlightChat from './DiscoveryFlightChat';

interface DiscoveryFlightChatModalProps {
  onClose: () => void;
  flightId: string;
  customerPhone: string;
}

const DiscoveryFlightChatModal: React.FC<DiscoveryFlightChatModalProps> = ({
  onClose,
  flightId,
  customerPhone,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-grow overflow-hidden p-6">
          <DiscoveryFlightChat
            flightId={flightId}
            customerPhone={customerPhone}
          />
        </div>
      </div>
    </div>
  );
};

export default DiscoveryFlightChatModal;
