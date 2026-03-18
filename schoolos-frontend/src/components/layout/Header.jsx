import { useTranslation } from 'react-i18next'
import { useKeycloak } from '@react-keycloak/web'
import { PanelLeftClose, PanelLeftOpen, LogOut, Building2 } from 'lucide-react'
import { useSchool } from '../../context/SchoolContext'
import { useQueryClient } from '@tanstack/react-query'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'gu', label: 'ગુ' },
]

export default function Header({ sidebarCollapsed, onToggleSidebar }) {
  const { i18n, t } = useTranslation('common')
  const { keycloak } = useKeycloak()
  const { schoolId, setSchoolId, schools, isAdmin } = useSchool()
  const queryClient = useQueryClient()

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('schoolos-lang', lang)
  }

  const handleSchoolChange = (e) => {
    const newId = e.target.value
    setSchoolId(newId)
    // Invalidate all queries so data refreshes for the new school
    queryClient.invalidateQueries()
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

      {/* Right: school selector + language + user */}
      <div className="flex items-center gap-4">
        {/* School Selector — admin sees dropdown, others see label */}
        {schools.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {isAdmin && schools.length > 1 ? (
              <select
                value={schoolId || ''}
                onChange={handleSchoolChange}
                className="text-sm font-medium text-gray-700 border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[180px]"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-700 max-w-[180px] truncate">
                {schools.find((s) => s.id === schoolId)?.name || schools[0]?.name || ''}
              </span>
            )}
          </div>
        )}

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
