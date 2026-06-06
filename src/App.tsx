import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { Dashboard } from '@/components/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
