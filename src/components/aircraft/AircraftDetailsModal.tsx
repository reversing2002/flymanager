// Update the existing AircraftDetailsModal.tsx
// Add the AircraftRemarks component to the modal content

import AircraftRemarks from './AircraftRemarks';

// ... existing imports ...

const AircraftDetailsModal: React.FC<AircraftDetailsModalProps> = ({
  aircraft,
  onClose,
  onEdit,
  onUpdate,
}) => {
  // ... existing code ...

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-lg max-w-2xl w-full">
          {/* ... existing header ... */}

          <div className="p-6 space-y-6">
            {/* ... existing content ... */}

            {/* Add the remarks section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Remarques</h3>
              <AircraftRemarks aircraftId={aircraft.id} />
            </div>
          </div>

          {/* ... existing footer ... */}
        </div>
      </div>
    </div>
  );
};

export default AircraftDetailsModal;