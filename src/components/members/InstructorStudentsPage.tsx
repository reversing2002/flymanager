import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertTriangle, User, Book, Award, Calendar, AlertCircle, Phone, PlusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, isAfter, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import StudentPerformanceStats from '../training/StudentPerformanceStats';
import { Box, Tabs, TabList, TabPanels, TabPanel, Tab } from '@chakra-ui/react';
import StudentProgressionView from '../progression/StudentProgressionView';
import { getStudentProgressions, getProgressionTemplates, createStudentProgression } from '../../lib/queries/progression';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  medicals: {
    id: string;
    obtained_at: string;
    expires_at: string;
    medical_types: {
      id: string;
      name: string;
    };
  }[];
  membership_expiry: string;
  student_progressions: {
    id: string;
    progression_templates: {
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    medicalStatus: 'all',
    membershipStatus: 'all',
    progressionStatus: 'all',
  });
  const [activeView, setActiveView] = useState('qcm');
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);

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

      // 2. Get basic student info and membership status
      const { data: students } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          medicals!user_id(
            id,
            obtained_at,
            expires_at,
            medical_types(*)
          )
        `)
        .in('id', studentIds);

      if (!students) return [];

      // Get membership entries for all students
      const { data: membershipEntries } = await supabase
        .from('member_contributions')
        .select(`
          id,
          user_id,
          valid_from,
          valid_until,
          account_entry:account_entries (
            id,
            amount,
            description,
            entry_type:account_entry_types!inner (
              code,
              name,
              is_credit
            )
          )
        `)
        .in('user_id', studentIds)
        .order('valid_until', { ascending: false });

      // Map membership expiry dates to students
      const studentWithMembership = students.map(student => {
        const latestMembership = membershipEntries
          ?.filter(entry => entry.user_id === student.id)
          ?.[0];

        return {
          ...student,
          membership_expiry: latestMembership?.valid_until || null
        };
      });

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
        .from('user_progress')
        .select(`
          user_id,
          module_id,
          progress,
          points_earned,
          updated_at
        `)
        .in('user_id', studentIds);

      // Combine all data
      return studentWithMembership.map(student => ({
        ...student,
        progressions: progressions?.filter(p => p.student_id === student.id) || [],
        training_results: trainingResults?.filter(r => r.user_id === student.id).map(r => ({
          module_id: r.module_id,
          score: r.points_earned,
          completed_at: r.progress === 100 ? r.updated_at : null
        })) || [],
        flight_count: flightStats[student.id].flight_count,
        total_flight_hours: flightStats[student.id].total_duration / 60
      }));
    },
    enabled: !!user?.id,
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: () => getProgressionTemplates(),
  });

  const { data: progressions, isLoading: loadingProgressions } = useQuery({
    queryKey: ['studentProgressions', selectedStudent],
    queryFn: () => selectedStudent ? getStudentProgressions(selectedStudent) : Promise.resolve([]),
    enabled: !!selectedStudent,
  });

  const handleCreateProgression = async (templateId: string) => {
    if (!selectedStudent) return;

    try {
      await createStudentProgression({
        student_id: selectedStudent,
        template_id: templateId,
        start_date: new Date().toISOString()
      });
      await queryClient.invalidateQueries(['instructorStudents', user?.id]);
      toast.success('Formation assignée avec succès');
      setShowTemplateSelect(false);
    } catch (error) {
      console.error('Erreur lors de l\'assignation de la formation:', error);
      toast.error('Erreur lors de l\'assignation de la formation');
    }
  };

  const filteredStudents = students.filter(student => {
    // Search filter
    const searchMatch = search === '' || 
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());

    // Medical status filter
    let medicalMatch = true;
    if (filters.medicalStatus !== 'all') {
      const latestMedical = student.medicals?.[0];
      if (!latestMedical) {
        medicalMatch = false;
      } else {
        const expiryDate = new Date(latestMedical.expires_at);
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
      const threeMonthsFromNow = addMonths(new Date(), 3);
      
      switch (filters.membershipStatus) {
        case 'valid':
          membershipMatch = membershipDate ? isAfter(membershipDate, new Date()) : false;
          break;
        case 'expired':
          membershipMatch = membershipDate ? !isAfter(membershipDate, new Date()) : true;
          break;
        case 'expiring':
          membershipMatch = membershipDate ? 
            (isAfter(membershipDate, new Date()) && !isAfter(membershipDate, threeMonthsFromNow)) : 
            false;
          break;
      }
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes élèves</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un élève..."
              className="pl-10 pr-4 py-2 border rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Filter size={20} />
            <span>Filtres</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
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

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedStudent === student.id ? 'border-sky-500 bg-sky-50' : 'hover:bg-gray-50'
              }`}
            >
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
                <div className="flex items-center gap-2">
                  {selectedStudent === student.id && showTemplateSelect ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                        onChange={(e) => handleCreateProgression(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Sélectionner une formation
                        </option>
                        {templates?.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setShowTemplateSelect(false);
                        }}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedStudent(student.id);
                        setShowTemplateSelect(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-50 rounded-lg"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Assigner une formation</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Certificat médical</div>
                  {student.medicals?.length > 0 ? (
                    <div className="space-y-2">
                      {student.medicals.map((medical) => (
                        <div key={medical.id} className="space-y-1">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            !medical.expires_at ? 'bg-emerald-100 text-emerald-800' :
                            isAfter(new Date(medical.expires_at), new Date()) ? 
                              isAfter(new Date(medical.expires_at), addMonths(new Date(), 3)) ? 
                                'bg-emerald-100 text-emerald-800' : 
                                'bg-amber-100 text-amber-800' : 
                              'bg-red-100 text-red-800'
                          }`}>
                            {medical.medical_types?.name || 'Type inconnu'} - {
                              !medical.expires_at ? 'Valide' :
                              isAfter(new Date(medical.expires_at), new Date()) ? 
                                isAfter(new Date(medical.expires_at), addMonths(new Date(), 3)) ? 
                                  'Valide' : 
                                  'Expire bientôt' : 
                                'Expiré'
                            }
                          </div>
                          {medical.expires_at && (
                            <div className="text-sm text-slate-500">
                              Expire le {format(new Date(medical.expires_at), 'dd MMMM yyyy', { locale: fr })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      Non renseigné
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Cotisation</div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    student.membership_expiry && isAfter(new Date(student.membership_expiry), new Date()) ? 
                      'bg-emerald-100 text-emerald-800' : 
                      'bg-red-100 text-red-800'
                  }`}>
                    {student.membership_expiry ? 
                      `Valide jusqu'au ${format(new Date(student.membership_expiry), 'dd/MM/yyyy', { locale: fr })}` : 
                      'Non renseignée'}
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
                          progression.completed_at ? 
                            'bg-emerald-100 text-emerald-800' : 
                            'bg-amber-100 text-amber-800'
                        }`}>
                          {progression.completed_at ? 'Terminée' : 'En cours'}
                        </span>
                      </div>
                    ))}
                    {student.training_results?.map((result) => (
                      <div
                        key={result.module_id}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded-lg"
                      >
                        <span className="text-sm">QCM - {result.score} points</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          result.completed_at ? 
                            'bg-emerald-100 text-emerald-800' : 
                            'bg-amber-100 text-amber-800'
                        }`}>
                          {result.completed_at ? 'Terminé' : 'En cours'}
                        </span>
                      </div>
                    ))}
                    {!student.progressions?.length && !student.training_results?.length && (
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
          ))}
        </div>

        <div className="border rounded-lg p-4">
          {selectedStudent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Performance détaillée</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('qcm')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'qcm'
                        ? 'bg-sky-100 text-sky-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    QCM
                  </button>
                  <button
                    onClick={() => setActiveView('formation')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'formation'
                        ? 'bg-sky-100 text-sky-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Formation
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {activeView === 'qcm' ? (
                  <StudentPerformanceStats userId={selectedStudent} />
                ) : (
                  <StudentProgressionView 
                    progressions={progressions || []} 
                    isLoading={loadingProgressions}
                    canValidate={true}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Sélectionnez un élève pour voir ses performances
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorStudentsPage;