import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, buttonVariants } from '../button.jsx'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button').className).toContain('border')
  })

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toContain('h-12')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click</Button>)

    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('forwards ref', () => {
    const ref = { current: null }
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('merges custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('has correct display name', () => {
    expect(Button.displayName).toBe('Button')
  })
})

describe('buttonVariants', () => {
  it('has default, destructive, outline, secondary, ghost, link variants', () => {
    expect(buttonVariants.variant).toHaveProperty('default')
    expect(buttonVariants.variant).toHaveProperty('destructive')
    expect(buttonVariants.variant).toHaveProperty('outline')
    expect(buttonVariants.variant).toHaveProperty('secondary')
    expect(buttonVariants.variant).toHaveProperty('ghost')
    expect(buttonVariants.variant).toHaveProperty('link')
  })

  it('has default, sm, lg, icon sizes', () => {
    expect(buttonVariants.size).toHaveProperty('default')
    expect(buttonVariants.size).toHaveProperty('sm')
    expect(buttonVariants.size).toHaveProperty('lg')
    expect(buttonVariants.size).toHaveProperty('icon')
  })
})
