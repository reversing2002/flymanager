import { useState, useEffect } from "react";
import { X, GripVertical } from "lucide-react";
import type { QualificationType } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";

interface QualificationOrderModalProps {
  qualifications: QualificationType[];
  clubId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const QualificationOrderModal = ({ qualifications, clubId, onClose, onSuccess }: QualificationOrderModalProps) => {
  const [orderedQualifications, setOrderedQualifications] = useState<QualificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        // Charger l'ordre actuel depuis qualification_order
        const { data: orderData, error: orderError } = await supabase
          .from("qualification_order")
          .select("qualification_id, position")
          .eq("club_id", clubId)
          .order("position");

        if (orderError) throw orderError;

        // Créer un map des positions
        const orderMap = new Map(orderData?.map(item => [item.qualification_id, item.position]));
        
        // Trier les qualifications selon l'ordre
        const sortedQualifications = [...qualifications].sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? Infinity;
          const orderB = orderMap.get(b.id) ?? Infinity;
          return orderA - orderB;
        });
        
        setOrderedQualifications(sortedQualifications);
      } catch (err) {
        console.error("Error loading qualification order:", err);
        setError("Erreur lors du chargement de l'ordre des qualifications");
        toast.error("Erreur lors du chargement de l'ordre des qualifications");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [qualifications, clubId]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
    
    if (sourceIndex === targetIndex) return;
    
    const newOrder = [...orderedQualifications];
    const [movedQualification] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, movedQualification);
    
    try {
      // Préparer les nouvelles positions
      const updates = newOrder.map((qualification, index) => ({
        club_id: clubId,
        qualification_id: qualification.id,
        position: index,
      }));

      // Supprimer les anciens ordres
      const { error: deleteError } = await supabase
        .from("qualification_order")
        .delete()
        .eq("club_id", clubId);

      if (deleteError) throw deleteError;

      // Insérer les nouveaux ordres
      const { error: insertError } = await supabase
        .from("qualification_order")
        .insert(updates);

      if (insertError) throw insertError;
      
      setOrderedQualifications(newOrder);
      toast.success("Ordre des qualifications mis à jour");
      onSuccess?.();
    } catch (err) {
      console.error("Error updating qualification order:", err);
      toast.error("Erreur lors de la mise à jour de l'ordre");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Ordre des qualifications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>
          ) : loading ? (
            <div className="p-4 text-center">Chargement...</div>
          ) : (
            <div className="space-y-2">
              {orderedQualifications.map((qualification, index) => (
                <div
                  key={qualification.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:bg-slate-50"
                >
                  <GripVertical className="h-5 w-5 text-slate-400" />
                  <span>{qualification.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualificationOrderModal;
