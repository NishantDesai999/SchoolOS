import { useKeycloak } from '@react-keycloak/web'

/**
 * Renders children only if user has all required roles.
 * Shows "Access Denied" if authenticated but missing roles.
 * Shows loading spinner while Keycloak initialises.
 *
 * @param {string[]} roles - Required Keycloak realm roles (any one match = allowed)
 */
export default function PrivateRoute({ children, roles = [] }) {
  const { keycloak, initialized } = useKeycloak()

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!keycloak.authenticated) {
    keycloak.login()
    return null
  }

  if (roles.length > 0 && !roles.some(role => keycloak.hasRealmRole(role))) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return children
}
