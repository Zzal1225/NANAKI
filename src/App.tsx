import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SectionProvider } from './context/SectionContext'
import { SyncProvider } from './context/SyncContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import BudgetPage from './pages/BudgetPage'
import HealthPage from './pages/HealthPage'
import SupplementsPage from './pages/SupplementsPage'
import ArchivePage from './pages/ArchivePage'
import HabitsPage from './pages/HabitsPage'
import SearchResultsPage from './pages/SearchResultsPage'
import BudgetSearchPage from './pages/BudgetSearchPage'
import UpdatePrompt from './components/pwa/UpdatePrompt'

export default function App() {
  return (
    <SectionProvider>
      <SyncProvider>
        <UpdatePrompt />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/health/supplements" element={<SupplementsPage />} />
              <Route path="/body" element={<Navigate to="/health" replace />} />
              <Route path="/mybody" element={<Navigate to="/health" replace />} />
              <Route path="/records" element={<ArchivePage />} />
              <Route path="/archive" element={<Navigate to="/records" replace />} />
              <Route path="/fitness" element={<Navigate to="/records" replace />} />
              <Route path="/budget/search" element={<BudgetSearchPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/habits" element={<HabitsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SyncProvider>
    </SectionProvider>
  )
}
