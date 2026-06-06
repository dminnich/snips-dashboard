import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true, toggle: vi.fn() }),
}))

vi.mock('@/hooks/useLocalData', () => ({
  useLocalData: () => ({
    months: [],
    weeks: [],
    updateMonth: vi.fn(),
    updateWeek: vi.fn(),
    addEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    toolbar: { exportData: () => '', importData: () => {}, reset: () => {} },
  }),
}))

describe('Dashboard', () => {
  it('renders all 12 month names', () => {
    render(<Dashboard />)
    expect(screen.getByText('January')).toBeInTheDocument()
    expect(screen.getByText('December')).toBeInTheDocument()
  })

  it('renders the legend', () => {
    render(<Dashboard />)
    expect(screen.getByText('Mission')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('renders edit/view and dark/light toggle buttons', () => {
    render(<Dashboard />)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
  })
})
