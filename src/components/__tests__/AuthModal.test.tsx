import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import AuthModal from '../AuthModal';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        signUp: vi.fn().mockResolvedValue({ data: { user: { id: '1' } } }),
        signInWithPassword: vi.fn(),
      },
    },
  };
});

const mockedSupabase = supabase as unknown as {
  auth: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
  };
};

describe('AuthModal', () => {
  test('submits sign up form', async () => {
    render(<AuthModal isOpen={true} onClose={() => {}} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Tester' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(mockedSupabase.auth.signUp).toHaveBeenCalled());
    expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
  });
});
