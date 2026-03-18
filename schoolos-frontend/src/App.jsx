import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import PrivateRoute from './auth/PrivateRoute'

// Dashboard
import AdminDashboard from './pages/dashboard/AdminDashboard'

// Students & Admissions
import StudentList from './pages/students/StudentList'
import StudentDetail from './pages/students/StudentDetail'
import StudentOnboarding from './pages/students/StudentOnboarding'
import AdmissionList from './pages/admissions/AdmissionList'

// SLC
import SlcList from './pages/slc/SlcList'
import SlcLookup from './pages/slc/SlcLookup'
import SlcIssue from './pages/slc/SlcIssue'
import SlcDetail from './pages/slc/SlcDetail'

// Fees
import FeeConfig from './pages/fees/FeeConfig'
import FeeCalculator from './pages/fees/FeeCalculator'
import InvoiceList from './pages/fees/InvoiceList'
import StudentLedger from './pages/fees/StudentLedger'
import DefaulterList from './pages/fees/DefaulterList'

// Payments
import PaymentForm from './pages/payments/PaymentForm'
import UpiUpload from './pages/payments/UpiUpload'
import PaymentHistory from './pages/payments/PaymentHistory'

// Digest
import DigestSettings from './pages/digest/DigestSettings'
import DigestPreview from './pages/digest/DigestPreview'

// School Setup
import CalendarYears from './pages/school/CalendarYears'
import ClassSectionSetup from './pages/school/ClassSectionSetup'

// Users
import UserList from './pages/users/UserList'

const ADMIN = ['admin']
const ADMIN_PRINCIPAL = ['admin', 'principal']
const ALL_ROLES = ['admin', 'principal', 'trustee']

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<AdminDashboard />} />

          {/* Students */}
          <Route path="students">
            <Route index element={<PrivateRoute roles={ADMIN_PRINCIPAL}><StudentList /></PrivateRoute>} />
            <Route path="new" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><StudentOnboarding /></PrivateRoute>} />
            <Route path=":id" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><StudentDetail /></PrivateRoute>} />
          </Route>

          {/* Admissions */}
          <Route path="admissions">
            <Route index element={<PrivateRoute roles={ADMIN_PRINCIPAL}><AdmissionList /></PrivateRoute>} />
            <Route path="new" element={<Navigate to="/students/new" replace />} />
          </Route>

          {/* SLC */}
          <Route path="slc">
            <Route index element={<PrivateRoute roles={ADMIN_PRINCIPAL}><SlcList /></PrivateRoute>} />
            <Route path="lookup" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><SlcLookup /></PrivateRoute>} />
            <Route path="issue" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><SlcIssue /></PrivateRoute>} />
            <Route path=":id" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><SlcDetail /></PrivateRoute>} />
          </Route>

          {/* Fees */}
          <Route path="fees">
            <Route index element={<PrivateRoute roles={ADMIN_PRINCIPAL}><FeeConfig /></PrivateRoute>} />
            <Route path="calculator" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><FeeCalculator /></PrivateRoute>} />
            <Route path="invoices" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><InvoiceList /></PrivateRoute>} />
            <Route path="ledger" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><StudentLedger /></PrivateRoute>} />
            <Route path="defaulters" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><DefaulterList /></PrivateRoute>} />
          </Route>

          {/* Payments */}
          <Route path="payments">
            <Route index element={<PrivateRoute roles={ADMIN_PRINCIPAL}><PaymentHistory /></PrivateRoute>} />
            <Route path="new" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><PaymentForm /></PrivateRoute>} />
            <Route path="upi" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><UpiUpload /></PrivateRoute>} />
          </Route>

          {/* Digest */}
          <Route path="digest">
            <Route index element={<PrivateRoute roles={ADMIN_PRINCIPAL}><DigestPreview /></PrivateRoute>} />
            <Route path="settings" element={<PrivateRoute roles={ADMIN_PRINCIPAL}><DigestSettings /></PrivateRoute>} />
          </Route>

          {/* School Setup */}
          <Route path="school">
            <Route index element={<PrivateRoute roles={ADMIN}><CalendarYears /></PrivateRoute>} />
            <Route path="classes" element={<PrivateRoute roles={ADMIN}><ClassSectionSetup /></PrivateRoute>} />
          </Route>

          {/* Users */}
          <Route path="users">
            <Route index element={<PrivateRoute roles={ADMIN}><UserList /></PrivateRoute>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
