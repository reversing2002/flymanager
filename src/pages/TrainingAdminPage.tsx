import { Link } from "react-router-dom";
import { Book, Puzzle, Calendar, Target } from "lucide-react";

const TrainingAdminPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Administration des Formations</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/training"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <Book className="h-8 w-8 text-sky-500" />
            <div>
              <h2 className="text-lg font-semibold">Modules de formation</h2>
              <p className="text-slate-600">Accéder aux modules de formation</p>
            </div>
          </div>
        </Link>

        <Link
          to="/training-admin/modules"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <Puzzle className="h-8 w-8 text-sky-500" />
            <div>
              <h2 className="text-lg font-semibold">Gestion des modules</h2>
              <p className="text-slate-600">Créer et modifier les modules</p>
            </div>
          </div>
        </Link>

        <Link
          to="/training-admin/challenges/manage"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <Calendar className="h-8 w-8 text-sky-500" />
            <div>
              <h2 className="text-lg font-semibold">Créer des défis</h2>
              <p className="text-slate-600">
                Créer de nouveaux défis quotidiens
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/training-admin/challenges"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <Target className="h-8 w-8 text-sky-500" />
            <div>
              <h2 className="text-lg font-semibold">Liste des défis</h2>
              <p className="text-slate-600">
                Voir et gérer les défis existants
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default TrainingAdminPage;
