export const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  if (!firstName && !lastName) return '??';
  
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  
  return `${firstInitial}${lastInitial}` || '??';
};
