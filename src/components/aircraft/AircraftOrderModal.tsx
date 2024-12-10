import { useState, useEffect } from "react";
import { X, GripVertical } from "lucide-react";
import type { Aircraft } from "../../types/database";
import { getAircraftOrder, updateAircraftOrder } from "../../services/aircraft";
import { toast } from "react-hot-toast";

interface AircraftOrderModalProps {
  aircraft: Aircraft[];
  onClose: () => void;
  onSuccess?: () => void;
}

const AircraftOrderModal = ({ aircraft, onClose, onSuccess }: AircraftOrderModalProps) => {
  const [orderedAircraft, setOrderedAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        // Charger l'ordre actuel
        const order = await getAircraftOrder(aircraft[0].club_id);
        
        // Trier les avions selon l'ordre
        const sortedAircraft = [...aircraft].sort((a, b) => {
          const orderA = order[a.id] ?? Infinity;
          const orderB = order[b.id] ?? Infinity;
          return orderA - orderB;
        });
        
        setOrderedAircraft(sortedAircraft);
      } catch (err) {
        console.error("Error loading aircraft order:", err);
        setError("Erreur lors du chargement de l'ordre des appareils");
        toast.error("Erreur lors du chargement de l'ordre des appareils");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [aircraft]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
    
    // Ne rien faire si on dépose au même endroit
    if (sourceIndex === targetIndex) return;
    
    // Réorganiser la liste
    const newOrder = [...orderedAircraft];
    const [movedAircraft] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, movedAircraft);
    
    try {
      // Générer le nouvel ordre
      const order = newOrder.reduce((acc, aircraft, index) => {
        acc[aircraft.id] = index;
        return acc;
      }, {} as { [key: string]: number });
      
      // Mettre à jour l'ordre dans la base de données
      await updateAircraftOrder(aircraft[0].club_id, order);
      
      // Mettre à jour l'état local
      setOrderedAircraft(newOrder);
      toast.success("Ordre des appareils mis à jour");
      onSuccess?.();
    } catch (err) {
      console.error("Error updating aircraft order:", err);
      toast.error("Erreur lors de la mise à jour de l'ordre");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Ordre des appareils</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              {error}
            </div>
          ) : loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {orderedAircraft.map((aircraft, index) => (
                <div
                  key={aircraft.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-lg cursor-move hover:border-slate-300 transition-colors"
                >
                  <GripVertical className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="font-medium">{aircraft.registration}</div>
                    <div className="text-sm text-slate-500">{aircraft.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AircraftOrderModal;