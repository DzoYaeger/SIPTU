import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import NotFound from "../pages/NotFound.jsx";

/**
 * ProtectedRoute - Component untuk melindungi route berdasarkan module access
 *
 * Props:
 * - children: Component yang akan dirender jika user memiliki akses
 * - moduleSlug: Slug module yang diperlukan untuk akses (e.g., "bmn-peminjaman-aset")
 * - role: Role spesifik yang diperlukan (optional, e.g., "admin", "operator", "validator")
 * - requireAuth: Boolean, apakah perlu login (default: true)
 * - fallback: Component fallback jika tidak memiliki akses (default: NotFound)
 */
function ProtectedRoute({
  children,
  moduleSlug,
  role,
  requireAuth = true,
  fallback = <NotFound />,
}) {
  const { user, currentRole, token, accessibleModules, hasRole } = useAuth();

  // Check if authentication is required
  if (requireAuth && !token) {
    return <Navigate to="/login" replace />;
  }

  // If no user data yet, show nothing (loading state handled by parent)
  if (requireAuth && !user) {
    return null;
  }

  // Admin has access to everything
  if (user?.base_role === "admin" || currentRole === "admin") {
    return children;
  }

  // Check specific role requirement
  if (role && currentRole !== role && user?.base_role !== role) {
    return fallback;
  }

  // Check module access if moduleSlug is provided
  if (moduleSlug) {
    // Check if user has access to this module
    const hasModuleAccess = accessibleModules?.includes(moduleSlug);

    // Also check using hasRole function for more granular permission
    const hasPermission = hasRole
      ? hasRole(currentRole, moduleSlug) || hasRole(user?.base_role, moduleSlug)
      : false;

    if (!hasModuleAccess && !hasPermission) {
      return fallback;
    }
  }

  return children;
}

/**
 * Hook untuk mengecek apakah user memiliki akses ke module tertentu
 */
export function useHasModuleAccess(moduleSlug) {
  const { user, currentRole, accessibleModules, hasRole } = useAuth();

  // Admin always has access
  if (user?.base_role === "admin" || currentRole === "admin") {
    return true;
  }

  // Check accessible modules
  if (accessibleModules?.includes(moduleSlug)) {
    return true;
  }

  // Check using hasRole function
  if (hasRole) {
    return (
      hasRole(currentRole, moduleSlug) || hasRole(user?.base_role, moduleSlug)
    );
  }

  return false;
}

/**
 * Hook untuk mengecek apakah user memiliki role tertentu
 */
export function useHasRole(role) {
  const { user, currentRole } = useAuth();
  return currentRole === role || user?.base_role === role;
}

export default ProtectedRoute;
