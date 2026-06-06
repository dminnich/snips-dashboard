import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WysiwygEditor } from './WysiwygEditor'

describe('WysiwygEditor', () => {
  it('renders toolbar buttons', () => {
    render(<WysiwygEditor html="" onChange={vi.fn()} />)
    expect(screen.getByTitle(/Bold/)).toBeInTheDocument()
    expect(screen.getByTitle(/Italic/)).toBeInTheDocument()
    expect(screen.getByTitle(/Underline/)).toBeInTheDocument()
  })

  it('renders size and color dropdowns', () => {
    render(<WysiwygEditor html="" onChange={vi.fn()} />)
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
  })

  it('renders all font size options', () => {
    render(<WysiwygEditor html="" onChange={vi.fn()} />)
    expect(screen.getByText('X-Small')).toBeInTheDocument()
    expect(screen.getByText('Small')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Large')).toBeInTheDocument()
    expect(screen.getByText('X-Large')).toBeInTheDocument()
  })

  it('renders red, orange, green as the first color options after Default', () => {
    render(<WysiwygEditor html="" onChange={vi.fn()} />)
    const selects = screen.getAllByRole('combobox')
    const colorSelect = selects[selects.length - 1]
    const options = Array.from(colorSelect.querySelectorAll('option'))
    const labels = options.map((o) => o.textContent)
    expect(labels[0]).toBe('Color')
    expect(labels.slice(1, 5)).toEqual(['Default', 'Red', 'Orange', 'Green'])
  })

  it('initializes contentEditable with provided html', () => {
    const { container } = render(<WysiwygEditor html="<b>hello</b>" onChange={vi.fn()} />)
    const editor = container.querySelector('[contenteditable]')
    expect(editor?.innerHTML).toBe('<b>hello</b>')
  })

  it('calls onChange when content is edited', () => {
    const onChange = vi.fn()
    const { container } = render(<WysiwygEditor html="" onChange={onChange} />)
    const editor = container.querySelector('[contenteditable]') as HTMLElement
    fireEvent.input(editor, { target: { innerHTML: 'new text' } })
    expect(onChange).toHaveBeenCalledWith('new text')
  })

  it('applies minHeight style', () => {
    const { container } = render(<WysiwygEditor html="" onChange={vi.fn()} minHeight="200px" />)
    const editor = container.querySelector('[contenteditable]') as HTMLElement
    expect(editor.style.minHeight).toBe('200px')
  })
})
