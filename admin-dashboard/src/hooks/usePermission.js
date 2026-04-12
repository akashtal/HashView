import { useAuth } from '../context/AuthContext';

/**
 * Convenience hook for checking a single permission.
 *
 * @param {string} permission - e.g. 'CREATE_BUSINESS'
 * @returns {boolean}
 *
 * Usage:
 *   const canCreate = usePermission('CREATE_BUSINESS');
 *   {canCreate && <button>Create Business</button>}
 */
const usePermission = (permission) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

export default usePermission;
