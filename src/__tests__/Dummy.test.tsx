import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Dummy Test', () => {
  it('renders correctly', () => {
    render(<div>Hello</div>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
