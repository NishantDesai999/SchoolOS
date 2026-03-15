import { useTranslation } from 'react-i18next'
import { useKeycloak } from '@react-keycloak/web'
import { Menu, LogOut, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'gu', label: 'ગુ' },
]

export default function Header({ sidebarCollapsed, onToggleSidebar }) {
  const { i18n, t } = useTranslation('common')
  const { keycloak } = useKeycloak()

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('schoolos-lang', lang)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      {/* Left: sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </button>

      {/* Right: language switcher + user menu */}
      <div className="flex items-center gap-4">
        {/* Language switcher */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                i18n.language === lang.code
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            {keycloak.tokenParsed?.name || keycloak.tokenParsed?.email || 'User'}
          </span>
          <button
            onClick={() => keycloak.logout()}
            className="flex items-center gap-1 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title={t('logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
