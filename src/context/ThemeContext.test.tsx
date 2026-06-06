import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function TestConsumer() {
  const { isDark, toggle } = useTheme()
  return (
    <div>
      <span data-testid="dark">{String(isDark)}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  )
}

describe('ThemeContext', () => {
  it('starts in dark mode', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('dark').textContent).toBe('true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles theme on button click', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('dark').textContent).toBe('false')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('updates data-theme attribute when toggled back', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByText('Toggle'))
    fireEvent.click(screen.getByText('Toggle'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('throws when useTheme is used outside provider', () => {
    function Bad() {
      useTheme()
      return null
    }
    expect(() => render(<Bad />)).toThrow('useTheme must be used within ThemeProvider')
  })
})
