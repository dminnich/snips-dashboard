import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dashboard } from './Dashboard'

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true, toggle: vi.fn() }),
}))

const monthsData = [
  { id: 'january', name: 'January', content: '', subtitle: '', specialEvents: '' },
  { id: 'february', name: 'February', content: '', subtitle: '', specialEvents: '' },
  { id: 'march', name: 'March', content: '', subtitle: '', specialEvents: '' },
  { id: 'april', name: 'April', content: '', subtitle: '', specialEvents: '' },
  { id: 'may', name: 'May', content: '', subtitle: '', specialEvents: '' },
  { id: 'august', name: 'August', content: '', subtitle: '', specialEvents: '' },
  { id: 'september', name: 'September', content: '', subtitle: '', specialEvents: '' },
  { id: 'october', name: 'October', content: '', subtitle: '', specialEvents: '' },
  { id: 'november', name: 'November', content: '', subtitle: '', specialEvents: '' },
  { id: 'december', name: 'December', content: '', subtitle: '', specialEvents: '' },
]

const weeksData = Array.from({ length: 10 }, (_, i) => ({
  id: `week-${i + 1}`,
  weekNumber: i + 1,
  subtitle: '',
  specialEvents: '',
  events: [],
}))

vi.mock('@/hooks/useLocalData', () => ({
  useLocalData: () => ({
    months: monthsData,
    weeks: weeksData,
    updateMonth: vi.fn(),
    updateWeek: vi.fn(),
    addEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    toolbar: { exportData: () => '{"months":[],"weeks":[]}', importData: vi.fn() },
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

  it('starts in view mode showing Edit button', () => {
    render(<Dashboard />)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
  })

  it('does not show Export/Import by default', () => {
    render(<Dashboard />)
    expect(screen.queryByText('Export JSON')).not.toBeInTheDocument()
  })

  it('switches to admin mode when Edit clicked, showing Export/Import and View button', () => {
    render(<Dashboard />)
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Export JSON')).toBeInTheDocument()
    expect(screen.getByText('Import JSON')).toBeInTheDocument()
  })

  it('switches back to view mode when View clicked', () => {
    render(<Dashboard />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('View'))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.queryByText('Export JSON')).not.toBeInTheDocument()
  })

  it('opens MonthEditor when a month header is clicked in admin mode', () => {
    const { container } = render(<Dashboard />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('January').closest('div.flex-1')!)
    const h2 = container.querySelector('h2')
    expect(h2?.textContent).toMatch(/Edit January/)
  })

  it('opens WeekEditor when a week header is clicked in admin mode', () => {
    const { container } = render(<Dashboard />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Week 1').closest('div[class*="cursor-pointer"]')!)
    const h2 = container.querySelector('h2')
    expect(h2?.textContent).toMatch(/Edit Week 1/)
  })

  it('shows + Add Group buttons in admin mode', () => {
    render(<Dashboard />)
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getAllByText('+ Add Group').length).toBe(10)
  })

  it('opens Add Group modal when + Add Group clicked', () => {
    render(<Dashboard />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getAllByText('+ Add Group')[0])
    expect(screen.getByText('Add Group')).toBeInTheDocument()
  })
})
