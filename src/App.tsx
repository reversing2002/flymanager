import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from '@mui/material/styles';
import { HelmetProvider } from 'react-helmet-async';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme/theme';
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./components/auth/LoginPage";
import CreateClubPage from "./components/auth/CreateClubPage";
import Dashboard from "./components/Dashboard";
import ProfilePage from "./components/profile/ProfilePage";
import MemberList from "./components/members/MemberList";
import MemberProfile from "./components/members/MemberProfile";
import RoleManagement from "./components/members/RoleManagement";
import MemberBalancesPage from "./components/members/MemberBalancesPage";
import AircraftList from "./components/aircraft/AircraftList";
import MaintenancePage from "./pages/MaintenancePage";
import CalendarContainer from "./components/reservations/CalendarContainer";
import ReservationList from "./components/reservations/ReservationList";
import FlightList from "./components/flights/FlightList";
import NewFlightForm from "./components/flights/NewFlightForm";
import AccountList from "./components/accounts/AccountList";
import ChatPage from "./components/chat/ChatPage";
import ChatList from "./components/chat/ChatList";
import PrivateChat from "./components/chat/PrivateChat";
import ChatRoom from "./components/chat/ChatRoom";
import EventsPage from "./components/events/EventsPage";
import TrainingPage from "./components/training/TrainingPage";
import TrainingAdminPage from "./components/training/admin/TrainingAdmin";
import TrainingModuleDetails from "./components/training/TrainingModuleDetails";
import ProgressionPage from "./components/progression/ProgressionPage";
import ProgressionAdminPage from "./components/progression/admin/ProgressionAdminPage";
import StudentProgressionsPage from "./components/progression/admin/StudentProgressionsPage";
import SettingsPage from "./components/admin/SettingsPage";
import StatsPage from "./components/stats/StatsPage";
import DocumentationPage from "./components/documentation/DocumentationPage";
import DiscoveryFlightsPage from "./pages/DiscoveryFlightsPage";
import DiscoveryQRCode from "./components/discovery/DiscoveryQRCode";
import EnhancedDiscoveryPage from "./components/discovery/EnhancedDiscoveryPage";
import NewDiscoveryFlightPage from "./pages/NewDiscoveryFlightPage";
import DiscoveryFlightSuccess from "./components/discovery/DiscoveryFlightSuccess";
import DiscoveryFlightError from "./components/discovery/DiscoveryFlightError";
import PassengerInfoForm from "./components/discovery/PassengerInfoForm";
import PassengerInfoConfirmation from "./components/discovery/PassengerInfoConfirmation";
import DiscoveryFlightClientPage from "./pages/DiscoveryFlightClientPage";
import Weather from './pages/Weather';
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import EmailMembersPage from "./components/admin/EmailMembersPage";
import AccountingMigrationSettings from "./components/settings/AccountingMigrationSettings";
import InstructorFlightsPage from "./components/flights/InstructorFlightsPage";
import InstructorStudentsPage from "./components/members/InstructorStudentsPage";
import AvailabilityManagementPage from "./components/availability/AvailabilityManagementPage";
import InstructorAvailabilityPage from "./components/availability/InstructorAvailabilityPage";
import AircraftAvailabilityPage from "./components/availability/AircraftAvailabilityPage";
import InstructorBillingList from "./components/billing/InstructorBillingList";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotificationList from "./components/admin/NotificationList";
import ClubStatsPage from "./pages/ClubStatsPage";
import InvoicesPage from "./pages/InvoicesPage";
import SimpleAccountingView from "./components/accounting/SimpleAccountingView";
import DiscoveryFlightSuccessPage from './pages/DiscoveryFlightSuccessPage';
import DiscoveryFlightCancelPage from './pages/DiscoveryFlightCancelPage';
import PilotStatsPage from "./components/members/PilotStatsPage";
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import PublicLayout from "./components/public/PublicLayout";
import HomePage from "./components/public/HomePage";
import PricingPage from "./components/public/PricingPage";
import ContactPage from "./components/public/ContactPage";
import CGVPage from "./components/public/CGVPage";
import FAQPage from "./components/public/FAQPage";
import FeaturesPage from "./components/public/FeaturesPage";
import LegalPage from "./components/public/LegalPage";
import RootPage from "./components/RootPage";
import RGPDPage from "./components/public/RGPDPage";
import AboutUsPage from "./components/public/AboutUsPage";
import WelcomeDashboard from './components/dashboard/WelcomeDashboard';
import WelcomeAI from "./components/welcome/WelcomeAI";
import { GoogleTagManager } from "./components/GoogleTagManager";
import ClubRouter from "./components/public/ClubRouter";
import ClubPublicHome from "./components/public/ClubPublicHome";
import OurFleet from "./components/public/pages/OurFleet";
import Training from "./components/public/pages/Training";
import Pricing from "./components/public/pages/Pricing";
import { Contact } from './components/public/pages/Contact';
import NewsPage from "./components/public/pages/NewsPage";
import NewsDetail from "./components/public/pages/NewsDetail";

// Initialiser dayjs avec la locale francaise
dayjs.locale('fr');

const App = () => {
  const queryClient = new QueryClient();
  const hostname = window.location.hostname;
  const isClubSubdomain = hostname.includes('.4fly.io') && !hostname.startsWith('www');
  const clubCode = isClubSubdomain ? hostname.split('.')[0] : null;

  console.log('App - Hostname:', hostname);
  console.log('App - Current Path:', window.location.pathname);
  console.log('App - Club Code:', clubCode);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Router>
              {isClubSubdomain ? (
                <ClubRouter clubCode={clubCode} />
              ) : (
                <AuthProvider>
                  <GoogleTagManager />
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#ffffff',
                        color: '#333333',
                      },
                    }}
                  />
                  <Routes>
                    {/* Route pour les sites de club - disponible dans tous les environnements */}
                    <Route path="/club/:clubCode/*" element={<ClubRouter />} />

                    {/* Pages publiques */}
                    <Route element={<PublicLayout />}>
                      <Route index element={<RootPage />} />
                      <Route path="/about" element={<AboutUsPage />} />
                      <Route path="/features" element={<FeaturesPage />} />
                      <Route path="/tarifs" element={<PricingPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/cgv" element={<CGVPage />} />
                      <Route path="/rgpd" element={<RGPDPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/legal" element={<LegalPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/update-password" element={<UpdatePasswordPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/create-club" element={<CreateClubPage />} />
                    </Route>

                    {/* Routes de vol découverte */}
                    <Route path="/discovery/qr" element={<DiscoveryQRCode />} />
                    <Route path="/discovery/qr2" element={<EnhancedDiscoveryPage />} />
                    <Route path="/discovery/new" element={<NewDiscoveryFlightPage />} />
                    <Route path="/discovery-flight/success" element={<DiscoveryFlightSuccessPage />} />
                    <Route path="/discovery-flight/cancel" element={<DiscoveryFlightCancelPage />} />
                    <Route path="/discovery-flight/error" element={<DiscoveryFlightError />} />
                    <Route path="/discovery-flights/:flightId/passenger-info" element={<PassengerInfoForm />} />
                    <Route path="/discovery-flights/:flightId/passenger-confirmation" element={<PassengerInfoConfirmation />} />
                    <Route path="/discovery-flights/:flightId/client" element={<DiscoveryFlightClientPage />} />
                    <Route path="/discovery-flights/:flightId/confirmation" element={<DiscoveryFlightSuccess />} />

                    {/* Routes protégées */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/welcome" element={<WelcomeAI />} />

                      {/* Profile */}
                      <Route path="/profile" element={<ProfilePage />} />

                      {/* Members */}
                      <Route path="/members" element={<ProtectedRoute><MemberList /></ProtectedRoute>} />
                      <Route path="/members/roles" element={<RoleManagement />} />
                      <Route path="/members/:id" element={<MemberProfile />} />
                      <Route path="/members/:id/stats" element={<PilotStatsPage />} />
                      <Route path="/members/balances" element={<ProtectedRoute roles={["admin"]}><MemberBalancesPage /></ProtectedRoute>} />

                      {/* Statistiques des clubs */}
                      <Route path="/club-stats" element={<ProtectedRoute><ClubStatsPage /></ProtectedRoute>} />

                      {/* Factures */}
                      <Route path="/invoices" element={<ProtectedRoute roles={["admin"]}><InvoicesPage /></ProtectedRoute>} />

                      {/* Instructor Students */}
                      <Route path="/instructor-students" element={<ProtectedRoute roles={["instructor"]}><InstructorStudentsPage /></ProtectedRoute>} />

                      {/* Aircraft */}
                      <Route path="/aircraft" element={<AircraftList />} />
                      <Route path="/aircraft/:aircraftId" element={<AircraftList />} />
                      <Route path="/aircraft/:id/maintenance" element={<ProtectedRoute roles={["admin", "mechanic"]}><MaintenancePage /></ProtectedRoute>} />

                      {/* Discovery Flights */}
                      <Route path="/discovery-flights" element={<ProtectedRoute roles={["admin", "discovery", "instructor"]}><DiscoveryFlightsPage /></ProtectedRoute>} />

                      {/* Reservations */}
                      <Route path="/reservations" element={<ProtectedRoute roles={["admin", "instructor", "pilot", "mechanic"]}><CalendarContainer /></ProtectedRoute>} />
                      <Route path="/my-reservations" element={<ProtectedRoute roles={["admin", "instructor", "pilot"]}><ReservationList /></ProtectedRoute>} />

                      {/* Flights */}
                      <Route path="/flights" element={<ProtectedRoute roles={["admin", "instructor", "pilot"]}><FlightList /></ProtectedRoute>} />
                      <Route path="/flights/new" element={<ProtectedRoute roles={["admin", "instructor", "pilot"]}><NewFlightForm /></ProtectedRoute>} />
                      <Route path="/instructor-flights" element={<ProtectedRoute roles={["instructor"]}><InstructorFlightsPage /></ProtectedRoute>} />

                      {/* Accounts */}
                      <Route path="/accounts" element={<AccountList />} />
                      <Route path="/notifications" element={<ProtectedRoute roles={["admin"]}><NotificationList /></ProtectedRoute>} />
                      <Route path="/instructor-billing" element={<ProtectedRoute roles={["admin"]}><InstructorBillingList /></ProtectedRoute>} />

                      {/* Chat */}
                      <Route
                        path="/chat"
                        element={<ProtectedRoute roles={["admin", "instructor", "pilot"]}><ChatPage /></ProtectedRoute>}
                      >
                        <Route index element={<ChatList />} />
                        <Route path="room/:roomId" element={<ChatRoom />} />
                        <Route path="private/:recipientId" element={<PrivateChat />} />
                      </Route>

                      {/* Events */}
                      <Route path="/events" element={<EventsPage />} />

                      {/* Documentation */}
                      <Route path="/documentation" element={<ProtectedRoute><DocumentationPage /></ProtectedRoute>} />

                      {/* Training */}
                      <Route path="/training" element={<TrainingPage />} />
                      <Route path="/training/:moduleId" element={<TrainingModuleDetails />} />
                      <Route path="/training-admin" element={<ProtectedRoute roles={["admin", "instructor"]}><TrainingAdminPage /></ProtectedRoute>} />

                      {/* Progression */}
                      <Route path="/progression" element={<ProtectedRoute roles={["instructor", "pilot"]}><ProgressionPage /></ProtectedRoute>} />
                      <Route path="/progression/admin" element={<ProtectedRoute roles={["admin", "instructor"]}><ProgressionAdminPage /></ProtectedRoute>} />
                      <Route path="/progression/students" element={<ProtectedRoute roles={["admin", "instructor"]}><StudentProgressionsPage /></ProtectedRoute>} />

                      {/* Availability Management */}
                      <Route path="/availability" element={<ProtectedRoute roles={["admin", "instructor", "mechanic", "pilot"]}><AvailabilityManagementPage /></ProtectedRoute>} />
                      <Route path="/availability/instructor/:id" element={<ProtectedRoute roles={["admin", "instructor"]}><InstructorAvailabilityPage /></ProtectedRoute>} />
                      <Route path="/availability/aircraft/:id" element={<ProtectedRoute roles={["admin", "mechanic"]}><AircraftAvailabilityPage /></ProtectedRoute>} />

                      {/* Stats */}
                      <Route path="/stats" element={<StatsPage />} />

                      {/* Settings */}
                      <Route path="/settings" element={<ProtectedRoute groups={["ADMIN"]}><SettingsPage /></ProtectedRoute>}>
                        <Route path="accounting-migration" element={<AccountingMigrationSettings />} />
                      </Route>

                      {/* Email - Admin only */}
                      <Route path="/admin/email" element={<ProtectedRoute roles={["admin"]}><EmailMembersPage /></ProtectedRoute>} />

                      {/* Weather */}
                      <Route path="/weather" element={<ProtectedRoute roles={["admin", "instructor", "pilot"]}><Weather /></ProtectedRoute>} />

                      {/* Comptabilité */}
                      <Route path="/accounting" element={<ProtectedRoute><SimpleAccountingView /></ProtectedRoute>} />
                    </Route>

                    {/* Route pour les pages du club */}
                    <Route path="/club/:clubCode" element={<ClubPublicHome />} />
                    <Route path="/club/:clubCode/page/:slug" element={<ClubPublicHome />} />
                    <Route path="/club/:clubCode/fleet" element={<OurFleet />} />
                    <Route path="/club/:clubCode/training" element={<Training />} />
                    <Route path="/club/:clubCode/tarifs" element={<Pricing />} />
                    <Route path="/club/:clubCode/contact" element={<Contact />} />
                    <Route path="/club/:clubCode/actualites" element={<NewsPage />} />
                    <Route path="/club/:clubCode/actualites/:newsId/:slug" element={<NewsDetail />} />
                    
                  </Routes>
                </AuthProvider>
              )}
            </Router>
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;