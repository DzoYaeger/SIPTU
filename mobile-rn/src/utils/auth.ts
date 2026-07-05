import { User } from '../types';

export const getHighestRole = (user: User | null): string => {
  if (!user) return 'User';
  
  // Combine base_role and available_roles
  const roles = new Set<string>();
  if (user.base_role) roles.add(user.base_role.toLowerCase());
  if (user.available_roles) {
    user.available_roles.forEach(r => roles.add(r.toLowerCase()));
  }

  // Priority: Aturan Level > Admin > Validator > Operator
  const rolesArray = Array.from(roles);
  
  if (rolesArray.some(r => r.includes('aturan'))) return 'Aturan Level';
  if (rolesArray.some(r => r.includes('admin'))) return 'Admin';
  if (rolesArray.some(r => r.includes('validator'))) return 'Validator';
  if (rolesArray.some(r => r.includes('operator'))) return 'Operator';
  
  return user.role || 'User';
};
