import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useKeycloak } from '@react-keycloak/web'
import {
  LayoutDashboard, GraduationCap, BookOpen,
  CreditCard, Wallet, FileText,
  CalendarDays, Settings, UserCog, Calculator
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { key: 'dashboard',  icon: LayoutDashboard, path: '/',               roles: ['admin', 'principal', 'trustee'] },
  { key: 'students',   icon: GraduationCap,   path: '/students',        roles: ['admin', 'principal'] },
  { key: 'fees',       icon: CreditCard,      path: '/fees',            roles: ['admin', 'principal'] },
  { key: 'feeCalc',   icon: Calculator,      path: '/fees/calculator', roles: ['admin', 'principal'] },
  { key: 'payments',   icon: Wallet,          path: '/payments',        roles: ['admin', 'principal'] },
  { key: 'slc',        icon: FileText,        path: '/slc',             roles: ['admin', 'principal'] },
  { key: 'digest',     icon: CalendarDays,    path: '/digest',          roles: ['admin', 'principal'] },
  { key: 'school',     icon: Settings,        path: '/school',          roles: ['admin'] },
  { key: 'users',      icon: UserCog,         path: '/users',           roles: ['admin'] },
]

export default function Sidebar({ collapsed }) {
  const { t } = useTranslation('common')
  const { keycloak } = useKeycloak()

  const visibleItems = navItems.filter(item =>
    item.roles.some(role => keycloak.hasRealmRole(role))
  )

  return (
    <aside
      className={clsx(
        'flex h-full flex-col bg-primary-900 text-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-primary-700 px-4">
        {collapsed ? (
          <BookOpen className="h-7 w-7 text-white" />
        ) : (
          <span className="text-lg font-bold tracking-tight">SchoolOS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {visibleItems.map(({ key, icon: Icon, path }) => (
            <li key={key}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-700 text-white'
                      : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{t(`nav.${key}`)}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
