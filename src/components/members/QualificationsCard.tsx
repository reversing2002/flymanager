import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from "../../lib/permissions";

interface QualificationsCardProps {
  userId: string;
  onEdit?: () => void;
}

interface Qualification {
  id: string;
  code: string;
  name: string;
  has_qualification: boolean;
}

const QualificationsCard: React.FC<QualificationsCardProps> = ({ userId, onEdit }) => {
  const { user: currentUser } = useAuth();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQualifications();
  }, [userId]);

  const loadQualifications = async () => {
    try {
      const { data, error } = await supabase
        .from('pilot_qualifications')
        .select('*')
        .eq('user_id', userId)
        .order('code');

      if (error) throw error;
      setQualifications(data || []);
    } catch (error) {
      console.error('Error loading qualifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-white rounded-xl h-48"></div>;
  }

  const hasQualifications = qualifications.some(q => q.has_qualification);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-600" />
          Qualifications
        </h2>
        {onEdit && hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']) && (
          <button
            onClick={onEdit}
            className="text-sm text-sky-600 hover:text-sky-700"
          >
            Modifier
          </button>
        )}
      </div>

      {hasQualifications ? (
        <div className="grid grid-cols-2 gap-2">
          {qualifications
            .filter(qual => qual.has_qualification)
            .map((qual) => (
              <div
                key={qual.id}
                className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-sm"
              >
                {qual.code} - {qual.name}
              </div>
            ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Aucune qualification</span>
        </div>
      )}
    </div>
  );
};

export default QualificationsCard;