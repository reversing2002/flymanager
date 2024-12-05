import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertTriangle, User, Book, Award, Calendar, AlertCircle, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, isAfter, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  medical_certifications: {
    class: 'CLASS_1' | 'CLASS_2';
    valid_until: string;
  }[];
  membership_expiry: string;
  progressions: {
    id: string;
    template: {
      title: string;
    };
    completed_at: string | null;
  }[];
  training_results: {
    module_id: string;
    score: number;
    completed_at: string;
  }[];
  flight_count: number;
  total_flight_hours: number;
}

const InstructorStudentsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    medicalStatus: 'all',
    membershipStatus: 'all',
    progressionStatus: 'all',
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['instructorStudents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. First get all student IDs from flights
      const { data: studentFlights } = await supabase
        .from('flights')
        .select('user_id, duration')
        .eq('instructor_id', user.id);

      if (!studentFlights?.length) return [];

      // Group flights by student and calculate totals
      const flightStats = studentFlights.reduce((acc, flight) => {
        if (!acc[flight.user_id]) {
          acc[flight.user_id] = {
            flight_count: 0,
            total_duration: 0
          };
        }
        acc[flight.user_id].flight_count++;
        acc[flight.user_id].total_duration += flight.duration;
        return acc;
      }, {} as Record<string, { flight_count: number; total_duration: number; }>);

      const studentIds = Object.keys(flightStats);

      // 2. Get basic student info
      const { data: students } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          membership_expiry,
          medical_certifications (
            class,
            valid_until
          )
        `)
        .in('id', studentIds);

      if (!students) return [];

      // 3. Get progressions for each student
      const { data: progressions } = await supabase
        .from('student_progressions')
        .select(`
          id,
          student_id,
          completed_at,
          template:progression_templates (
            title
          )
        `)
        .in('student_id', studentIds);

      // 4. Get training results
      const { data: trainingResults } = await supabase
        .from('training_results')
        .select('*')
        .in('user_id', studentIds);

      // Combine all data
      return students.map(student => ({
        ...student,
        progressions: progressions?.filter(p => p.student_id === student.id) || [],
        training_results: trainingResults?.filter(r => r.user_id === student.id) || [],
        flight_count: flightStats[student.id].flight_count,
        total_flight_hours: flightStats[student.id].total_duration / 60
      }));
    },
    enabled: !!user?.id,
  });

  const filteredStudents = students.filter(student => {
    // Search filter
    const searchMatch = search === '' || 
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());

    // Medical status filter
    let medicalMatch = true;
    if (filters.medicalStatus !== 'all') {
      const latestMedical = student.medical_certifications?.[0];
      if (!latestMedical) {
        medicalMatch = false;
      } else {
        const expiryDate = new Date(latestMedical.valid_until);
        const threeMonthsFromNow = addMonths(new Date(), 3);
        
        switch (filters.medicalStatus) {
          case 'valid':
            medicalMatch = isAfter(expiryDate, new Date());
            break;
          case 'expired':
            medicalMatch = !isAfter(expiryDate, new Date());
            break;
          case 'expiring':
            medicalMatch = isAfter(expiryDate, new Date()) && !isAfter(expiryDate, threeMonthsFromNow);
            break;
        }
      }
    }

    // Membership status filter
    let membershipMatch = true;
    if (filters.membershipStatus !== 'all') {
      const membershipDate = student.membership_expiry ? new Date(student.membership_expiry) : null;
      membershipMatch = filters.membershipStatus === 'valid' ?
        (membershipDate ? isAfter(membershipDate, new Date()) : false) :
        (membershipDate ? !isAfter(membershipDate, new Date()) : true);
    }

    // Progression status filter
    let progressionMatch = true;
    if (filters.progressionStatus !== 'all') {
      const hasCompletedProgression = student.progressions?.some(p => p.completed_at);
      progressionMatch = filters.progressionStatus === 'completed' ? 
        hasCompletedProgression : 
        !hasCompletedProgression;
    }

    return searchMatch && medicalMatch && membershipMatch && progressionMatch;
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mes élèves</h1>
        <p className="text-slate-600">Suivi des élèves et de leur progression</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Certificat médical
                </label>
                <select
                  value={filters.medicalStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, medicalStatus: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="all">Tous</option>
                  <option value="valid">Valide</option>
                  <option value="expiring">Expire bientôt</option>
                  <option value="expired">Expiré</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cotisation
                </label>
                <select
                  value={filters.membershipStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, membershipStatus: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="all">Tous</option>
                  <option value="valid">À jour</option>
                  <option value="expired">Expirée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Formation
                </label>
                <select
                  value={filters.progressionStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, progressionStatus: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="all">Tous</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminée</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => {
          const latestMedical = student.medical_certifications?.[0];
          const isMedicalValid = latestMedical && isAfter(new Date(latestMedical.valid_until), new Date());
          const isMedicalExpiringSoon = latestMedical && 
            isAfter(new Date(latestMedical.valid_until), new Date()) &&
            !isAfter(new Date(latestMedical.valid_until), addMonths(new Date(), 3));
          
          const isMembershipValid = student.membership_expiry && 
            isAfter(new Date(student.membership_expiry), new Date());

          return (
            <div
              key={student.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link
                      to={`/members/${student.id}`}
                      className="text-lg font-semibold text-slate-900 hover:text-sky-600"
                    >
                      {student.first_name} {student.last_name}
                    </Link>
                    <div className="mt-1 space-y-1 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{student.email}</span>
                      </div>
                      {student.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{student.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Certificat médical</div>
                    {latestMedical ? (
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isMedicalValid
                          ? isMedicalExpiringSoon
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {latestMedical.class} - {
                          isMedicalValid
                            ? isMedicalExpiringSoon
                              ? 'Expire bientôt'
                              : 'Valide'
                            : 'Expiré'
                        }
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Non renseigné</span>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Cotisation</div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isMembershipValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isMembershipValid ? 'À jour' : 'Expirée'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Formation</div>
                    <div className="space-y-2">
                      {student.progressions?.map((progression) => (
                        <div
                          key={progression.id}
                          className="flex items-center justify-between bg-slate-50 p-2 rounded-lg"
                        >
                          <span className="text-sm">{progression.template.title}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            progression.completed_at
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {progression.completed_at ? 'Terminée' : 'En cours'}
                          </span>
                        </div>
                      ))}
                      {!student.progressions?.length && (
                        <span className="text-sm text-slate-500">Aucune formation en cours</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Vols réalisés</div>
                      <div className="text-lg font-medium text-slate-900">
                        {student.flight_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Heures de vol</div>
                      <div className="text-lg font-medium text-slate-900">
                        {student.total_flight_hours.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="col-span-full text-center py-12">
            <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Aucun élève trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorStudentsPage;