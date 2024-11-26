import { useAuth } from '../contexts/AuthContext';

export function useUser() {
  const { user, role } = useAuth();

  return {
    user,
    role,
    isAdmin: role === 'ADMIN',
    isInstructor: role === 'INSTRUCTOR',
    isPilot: role === 'PILOT',
  };
}
