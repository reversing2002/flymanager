import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./components/auth/LoginPage";
import Dashboard from "./components/Dashboard";
import ProfilePage from "./components/profile/ProfilePage";
import MemberList from "./components/members/MemberList";
import MemberProfile from "./components/members/MemberProfile";
import AircraftList from "./components/aircraft/AircraftList";
import MaintenancePage from "./pages/MaintenancePage";
import ReservationCalendar from "./components/reservations/ReservationCalendar";
import FlightList from "./components/flights/FlightList";
import NewFlightForm from "./components/flights/NewFlightForm";
import AccountList from "./components/accounts/AccountList";
import ChatPage from "./components/chat/ChatPage";
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
          <Toaster position="top-right" />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

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
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR"]}>
                    <MemberList />
                  </ProtectedRoute>
                }
              />
              <Route path="members/:id" element={<MemberProfile />} />

              {/* Aircraft */}
              <Route path="aircraft" element={<AircraftList />} />
              <Route
                path="aircraft/:id/maintenance"
                element={
                  <ProtectedRoute roles={["ADMIN", "MECHANIC"]}>
                    <MaintenancePage />
                  </ProtectedRoute>
                }
              />

              {/* Reservations */}
              <Route
                path="reservations"
                element={
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR", "PILOT"]}>
                    <ReservationCalendar />
                  </ProtectedRoute>
                }
              />

              {/* Flights */}
              <Route
                path="flights"
                element={
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR", "PILOT"]}>
                    <FlightList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="flights/new"
                element={
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR", "PILOT"]}>
                    <NewFlightForm />
                  </ProtectedRoute>
                }
              />

              {/* Accounts */}
              <Route path="accounts" element={<AccountList />} />

              {/* Chat */}
              <Route path="chat" element={<ChatPage />} />

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
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR"]}>
                    <TrainingAdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Progression */}
              <Route
                path="progression"
                element={
                  <ProtectedRoute roles={["INSTRUCTOR", "PILOT"]}>
                    <ProgressionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="progression/admin"
                element={
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR"]}>
                    <ProgressionAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="progression/students"
                element={
                  <ProtectedRoute roles={["ADMIN", "INSTRUCTOR"]}>
                    <StudentProgressionsPage />
                  </ProtectedRoute>
                }
              />

              {/* Stats */}
              <Route path="stats" element={<StatsPage />} />

              {/* Settings - Admin only */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;