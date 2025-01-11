import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

// Initialiser dayjs avec la locale française
dayjs.locale('fr');

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Toaster position="top-right" />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/create-club" element={<CreateClubPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
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

              {/* Protected routes - MainLayout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard comme page d'accueil */}
                <Route index element={<Dashboard />} />

                {/* Profile */}
                <Route path="profile" element={<ProfilePage />} />

                {/* Members */}
                <Route
                  path="members"
                  element={
                    <ProtectedRoute>
                      <MemberList />
                    </ProtectedRoute>
                  }
                />
                <Route path="members/roles" element={<RoleManagement />} />
                <Route path="members/:id" element={<MemberProfile />} />
                <Route path="members/:id/stats" element={<PilotStatsPage />} />

                {/* Statistiques des clubs */}
                <Route
                  path="club-stats"
                  element={
                    <ProtectedRoute>
                      <ClubStatsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Factures */}
                <Route
                  path="invoices"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <InvoicesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Instructor Students */}
                <Route
                  path="instructor-students"
                  element={
                    <ProtectedRoute roles={["instructor"]}>
                      <InstructorStudentsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Aircraft */}
                <Route path="aircraft" element={<AircraftList />} />
                <Route
                  path="aircraft/:id/maintenance"
                  element={
                    <ProtectedRoute roles={["admin", "mechanic"]}>
                      <MaintenancePage />
                    </ProtectedRoute>
                  }
                />

                {/* Discovery Flights */}
                <Route
                  path="discovery-flights"
                  element={
                    <ProtectedRoute roles={["admin", "discovery", "instructor"]}>
                      <DiscoveryFlightsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Reservations */}
                <Route
                  path="reservations"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "pilot", "mechanic"]}>
                      <CalendarContainer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="my-reservations"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "pilot"]}>
                      <ReservationList />
                    </ProtectedRoute>
                  }
                />

                {/* Flights */}
                <Route
                  path="flights"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "pilot"]}>
                      <FlightList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="flights/new"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "pilot"]}>
                      <NewFlightForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="instructor-flights"
                  element={
                    <ProtectedRoute roles={["instructor"]}>
                      <InstructorFlightsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Accounts */}
                <Route path="accounts" element={<AccountList />} />
                <Route
                  path="notifications"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <NotificationList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="instructor-billing"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <InstructorBillingList />
                    </ProtectedRoute>
                  }
                />

                {/* Chat */}
                <Route
                  path="chat"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "pilot"]}>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ChatList />} />
                  <Route path="room/:roomId" element={<ChatRoom />} />
                  <Route path="private/:recipientId" element={<PrivateChat />} />
                </Route>

                {/* Events */}
                <Route path="events" element={<EventsPage />} />

                {/* Documentation */}
                <Route path="documentation" element={
                  <ProtectedRoute>
                    <DocumentationPage />
                  </ProtectedRoute>
                } />

                {/* Training */}
                <Route path="training" element={<TrainingPage />} />
                <Route path="training/:moduleId" element={<TrainingModuleDetails />} />
                <Route
                  path="training-admin"
                  element={
                    <ProtectedRoute roles={["admin", "instructor"]}>
                      <TrainingAdminPage />
                    </ProtectedRoute>
                  }
                />

                {/* Progression */}
                <Route
                  path="progression"
                  element={
                    <ProtectedRoute roles={["instructor", "pilot"]}>
                      <ProgressionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="progression/admin"
                  element={
                    <ProtectedRoute roles={["admin", "instructor"]}>
                      <ProgressionAdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="progression/students"
                  element={
                    <ProtectedRoute roles={["admin", "instructor"]}>
                      <StudentProgressionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Availability Management */}
                <Route
                  path="availability"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "mechanic", "pilot"]}>
                      <AvailabilityManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="availability/instructor/:id"
                  element={
                    <ProtectedRoute roles={["admin", "instructor"]}>
                      <InstructorAvailabilityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="availability/aircraft/:id"
                  element={
                    <ProtectedRoute roles={["admin", "mechanic"]}>
                      <AircraftAvailabilityPage />
                    </ProtectedRoute>
                  }
                />

                {/* Stats */}
                <Route path="stats" element={<StatsPage />} />

                {/* Settings */}
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute groups={["ADMIN"]}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                >
                  <Route path="accounting-migration" element={<AccountingMigrationSettings />} />
                </Route>

                {/* Email - Admin only */}
                <Route
                  path="admin/email"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <EmailMembersPage />
                    </ProtectedRoute>
                  }
                />

                {/* Weather */}
                <Route
                  path="weather"
                  element={
                    <ProtectedRoute roles={["admin", "instructor", "pilot"]}>
                      <Weather />
                    </ProtectedRoute>
                  }
                />

                {/* Comptabilité */}
                <Route
                  path="accounting"
                  element={
                    <ProtectedRoute>
                      <SimpleAccountingView />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </LocalizationProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;