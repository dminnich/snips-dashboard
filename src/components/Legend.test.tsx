import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Legend } from './Legend'

describe('Legend', () => {
  it('renders all three status labels', () => {
    render(<Legend />)
    expect(screen.getByText('Mission')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })
})
