import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';

import TripDashboardPage from '../TripDashboardPage';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    },
  };
});

const mockedSupabase = supabase as unknown as {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

describe('TripDashboardPage', () => {
  test('shows authentication modal when user not logged in', async () => {
    render(
      <MemoryRouter initialEntries={['/trip/123']}>
        <Routes>
          <Route path="/trip/:tripId" element={<TripDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockedSupabase.auth.getUser).toHaveBeenCalled());
    expect(await screen.findByText(/create account/i)).toBeInTheDocument();
  });
});
