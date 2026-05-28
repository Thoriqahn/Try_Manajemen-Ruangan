import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from '../app/components/auth/LoginPage';

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

describe('LoginPage Component', () => {
  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Pastikan teks judul muncul
    expect(screen.getByText('Selamat Datang')).toBeInTheDocument();
    
    // Pastikan field email dan password ada
    expect(screen.getByPlaceholderText('nama@oikn.go.id')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('disables the submit button when inputs are empty or invalid', async () => {
    render(<LoginPage onLogin={vi.fn()} onNavigate={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Sistem/i });
    
    // Harus disabled secara default (karena input kosong)
    expect(submitBtn).toBeDisabled();

    // Isi email tidak valid
    const emailInput = screen.getByPlaceholderText('nama@oikn.go.id');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Masih disabled
    expect(submitBtn).toBeDisabled();
  });
});
