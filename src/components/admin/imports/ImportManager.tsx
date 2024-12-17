import { useState } from 'react';
import { Plane, Users, Receipt, Calendar, FileText } from 'lucide-react';
import FlightImportTab from './FlightImportTab';
import AccountImportTab from './AccountImportTab';
import MemberImportTab from './MemberImportTab';
import AircraftJsonTab from './AircraftJsonTab';
import AccountTypeJsonTab from './AccountTypeJsonTab';

const TABS = [
  { id: 'avions', label: 'Avions', icon: Plane, component: AircraftJsonTab },
  { id: 'membres', label: 'Membres', icon: Users, component: MemberImportTab },
  { id: 'types-compta', label: 'Types Compta', icon: FileText, component: AccountTypeJsonTab },
  { id: 'comptes', label: 'Comptes', icon: Receipt, component: AccountImportTab },
  { id: 'vols', label: 'Vols', icon: Calendar, component: FlightImportTab },
];

const ImportManager = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
        <h3 className="font-medium mb-2">Ordre d'import recommandé :</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Appareils</li>
          <li>Membres</li>
          <li>Types d'opérations comptables</li>
          <li>Opérations comptables</li>
          <li>Vols</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b overflow-x-auto">
          <nav className="flex -mb-px min-w-full">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {TABS.map(({ id, component: Component }) => {
            if (activeTab !== id) return null;
            return <Component key={id} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default ImportManager;
