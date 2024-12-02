import { useAuth } from '../contexts/AuthContext';
import { hasAnyGroup } from "../lib/permissions";

export function useUser() {
  const { user, role } = useAuth();

  return {
    user,
    role,
    isAdmin: hasAnyGroup({ role } as User, ['ADMIN']),
    isInstructor: hasAnyGroup({ role } as User, ['INSTRUCTOR']),
    isPilot: hasAnyGroup({ role } as User, ['PILOT']),
  };
}
