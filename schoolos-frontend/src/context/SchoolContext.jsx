import { createContext, useContext, useState, useEffect } from 'react'
import { useKeycloak } from '@react-keycloak/web'
import { useQuery } from '@tanstack/react-query'
import { schoolApi } from '../api/school'

const SchoolContext = createContext(null)

export function SchoolProvider({ children }) {
  const { keycloak } = useKeycloak()

  // Initialise from localStorage, then fall back to JWT school_id claim
  const [schoolId, setSchoolIdState] = useState(() => {
    return (
      localStorage.getItem('schoolos-school-id') ||
      keycloak.tokenParsed?.school_id ||
      null
    )
  })

  const isAdmin = keycloak.hasRealmRole('admin')

  // Fetch all schools (admin only; for others returns just their school)
  const { data: schoolsData } = useQuery({
    queryKey: ['schools-list'],
    queryFn: () => (isAdmin ? schoolApi.listAll() : schoolApi.getSchool().then((s) => [s])),
    enabled: !!keycloak.authenticated,
    staleTime: 1000 * 60 * 10,
  })

  const schools = Array.isArray(schoolsData) ? schoolsData : schoolsData?.data || []

  // Ensure schoolId is always set to a valid value once schools are loaded
  useEffect(() => {
    if (!schoolId && schools.length > 0) {
      setSchoolId(schools[0].id)
    }
  }, [schools, schoolId])

  const setSchoolId = (id) => {
    setSchoolIdState(id)
    localStorage.setItem('schoolos-school-id', id)
  }

  const selectedSchool = schools.find((s) => s.id === schoolId) || schools[0] || null

  return (
    <SchoolContext.Provider value={{ schoolId, setSchoolId, schools, selectedSchool, isAdmin }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error('useSchool must be used inside SchoolProvider')
  return ctx
}
