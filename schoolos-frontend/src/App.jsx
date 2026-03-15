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
import InquiryForm from './pages/admissions/InquiryForm'

// Teachers
import TeacherList from './pages/teachers/TeacherList'
import TeacherDetail from './pages/teachers/TeacherDetail'
import SalaryPayment from './pages/teachers/SalaryPayment'

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

// Govt OCR
import CircularUpload from './pages/govtocr/CircularUpload'
import OcrResult from './pages/govtocr/OcrResult'

// Digest
import DigestSettings from './pages/digest/DigestSettings'
import DigestPreview from './pages/digest/DigestPreview'

// School Setup
import CalendarYears from './pages/school/CalendarYears'
import ClassSectionSetup from './pages/school/ClassSectionSetup'

// Users
import UserList from './pages/users/UserList'

const ADMIN = ['ADMIN']
const ADMIN_ACCT = ['ADMIN', 'ACCOUNTANT']

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
            <Route index element={<PrivateRoute roles={ADMIN_ACCT}><StudentList /></PrivateRoute>} />
            <Route path="new" element={<PrivateRoute roles={ADMIN}><StudentOnboarding /></PrivateRoute>} />
            <Route path=":id" element={<PrivateRoute roles={ADMIN_ACCT}><StudentDetail /></PrivateRoute>} />
          </Route>

          {/* Admissions */}
          <Route path="admissions">
            <Route index element={<PrivateRoute roles={ADMIN}><AdmissionList /></PrivateRoute>} />
            <Route path="new" element={<PrivateRoute roles={ADMIN}><InquiryForm /></PrivateRoute>} />
          </Route>

          {/* Teachers */}
          <Route path="teachers">
            <Route index element={<PrivateRoute roles={ADMIN}><TeacherList /></PrivateRoute>} />
            <Route path=":id" element={<PrivateRoute roles={ADMIN}><TeacherDetail /></PrivateRoute>} />
            <Route path=":id/salary" element={<PrivateRoute roles={ADMIN}><SalaryPayment /></PrivateRoute>} />
          </Route>

          {/* SLC */}
          <Route path="slc">
            <Route index element={<PrivateRoute roles={ADMIN}><SlcList /></PrivateRoute>} />
            <Route path="lookup" element={<PrivateRoute roles={ADMIN}><SlcLookup /></PrivateRoute>} />
            <Route path="issue" element={<PrivateRoute roles={ADMIN}><SlcIssue /></PrivateRoute>} />
            <Route path=":id" element={<PrivateRoute roles={ADMIN}><SlcDetail /></PrivateRoute>} />
          </Route>

          {/* Fees */}
          <Route path="fees">
            <Route index element={<PrivateRoute roles={ADMIN_ACCT}><FeeConfig /></PrivateRoute>} />
            <Route path="calculator" element={<PrivateRoute roles={ADMIN_ACCT}><FeeCalculator /></PrivateRoute>} />
            <Route path="invoices" element={<PrivateRoute roles={ADMIN_ACCT}><InvoiceList /></PrivateRoute>} />
            <Route path="ledger" element={<PrivateRoute roles={ADMIN_ACCT}><StudentLedger /></PrivateRoute>} />
            <Route path="defaulters" element={<PrivateRoute roles={ADMIN_ACCT}><DefaulterList /></PrivateRoute>} />
          </Route>

          {/* Payments */}
          <Route path="payments">
            <Route index element={<PrivateRoute roles={ADMIN_ACCT}><PaymentHistory /></PrivateRoute>} />
            <Route path="new" element={<PrivateRoute roles={ADMIN_ACCT}><PaymentForm /></PrivateRoute>} />
            <Route path="upi" element={<PrivateRoute roles={ADMIN_ACCT}><UpiUpload /></PrivateRoute>} />
          </Route>

          {/* Govt Circular OCR */}
          <Route path="govtocr">
            <Route index element={<PrivateRoute roles={ADMIN}><CircularUpload /></PrivateRoute>} />
            <Route path=":id" element={<PrivateRoute roles={ADMIN}><OcrResult /></PrivateRoute>} />
          </Route>

          {/* Digest */}
          <Route path="digest">
            <Route index element={<PrivateRoute roles={ADMIN}><DigestPreview /></PrivateRoute>} />
            <Route path="settings" element={<PrivateRoute roles={ADMIN}><DigestSettings /></PrivateRoute>} />
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
