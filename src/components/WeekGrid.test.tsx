import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeekGrid } from './WeekGrid'
import { SUMMER_WEEKS } from '@/utils/dates'
import type { WeekData } from '@/types'

const defaultWeeks: WeekData[] = SUMMER_WEEKS.map((w) => ({
  id: `week-${w.number}`,
  weekNumber: w.number,
  subtitle: '',
  specialEvents: '',
  events: [],
}))

describe('WeekGrid', () => {
  it('renders all 10 week headers', () => {
    render(<WeekGrid weeks={defaultWeeks} />)
    expect(screen.getByText('Week 1')).toBeInTheDocument()
    expect(screen.getByText('Week 10')).toBeInTheDocument()
  })

  it('renders all week numbers', () => {
    render(<WeekGrid weeks={defaultWeeks} />)
    expect(screen.getByText('Week 1')).toBeInTheDocument()
    expect(screen.getByText('Week 5')).toBeInTheDocument()
    expect(screen.getByText('Week 6')).toBeInTheDocument()
    expect(screen.getByText('Week 10')).toBeInTheDocument()
  })

  it('shows "No groups" for empty weeks', () => {
    render(<WeekGrid weeks={defaultWeeks} />)
    const emptyMessages = screen.getAllByText('No groups')
    expect(emptyMessages).toHaveLength(10)
  })

  it('shows Add Group buttons in admin mode', () => {
    render(<WeekGrid weeks={defaultWeeks} isAdmin />)
    const buttons = screen.getAllByText('+ Add Group')
    expect(buttons).toHaveLength(10)
  })
})
