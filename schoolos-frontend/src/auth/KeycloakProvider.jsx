import { ReactKeycloakProvider } from '@react-keycloak/web'
import keycloak from './keycloak'

const initOptions = {
  onLoad: 'login-required',
  pkceMethod: 'S256',
  checkLoginIframe: false,
}

export default function KeycloakProvider({ children }) {
  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={initOptions}
      onTokens={({ token }) => {
        if (token) {
          // Token is automatically used by axiosClient interceptor
        }
      }}
    >
      {children}
    </ReactKeycloakProvider>
  )
}
