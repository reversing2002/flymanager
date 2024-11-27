import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListOrdered, Plane } from "lucide-react";
import AircraftOrderModal from "../aircraft/AircraftOrderModal";
import FlightTypeOrderModal from "./FlightTypeOrderModal";

const Admin = () => {
  const navigate = useNavigate();
  const [showAircraftOrderModal, setShowAircraftOrderModal] = useState(false);
  const [showFlightTypeOrderModal, setShowFlightTypeOrderModal] = useState(false);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
        <p className="text-slate-600">Gérez les paramètres du club</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Gestion de l'ordre des avions */}
        <div className="p-4 rounded-lg border bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Plane className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="font-semibold">Ordre des avions</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Définissez l'ordre d'affichage des avions dans le planning
          </p>
          <button
            onClick={() => setShowAircraftOrderModal(true)}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Gérer l'ordre
          </button>
        </div>

        {/* Gestion des types de vol */}
        <div className="p-4 rounded-lg border bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-50">
              <ListOrdered className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="font-semibold">Types de vol</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Gérez les types de vol et leur ordre d'affichage
          </p>
          <button
            onClick={() => setShowFlightTypeOrderModal(true)}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Gérer les types
          </button>
        </div>
      </div>

      {showAircraftOrderModal && (
        <AircraftOrderModal onClose={() => setShowAircraftOrderModal(false)} />
      )}

      {showFlightTypeOrderModal && (
        <FlightTypeOrderModal onClose={() => setShowFlightTypeOrderModal(false)} />
      )}
    </div>
  );
};

export default Admin;
