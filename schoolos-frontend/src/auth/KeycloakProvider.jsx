import { ReactKeycloakProvider } from '@react-keycloak/web'
import keycloak from './keycloak'

const initOptions = {
  onLoad: 'login-required',
  pkceMethod: 'S256',
  checkLoginIframe: false,
}

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}>
      Loading…
    </div>
  )
}

export default function KeycloakProvider({ children }) {
  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={initOptions}
      LoadingComponent={<Loading />}
      onEvent={(event, error) => {
        if (error) console.error('Keycloak event error:', event, error)
      }}
    >
      {children}
    </ReactKeycloakProvider>
  )
}
