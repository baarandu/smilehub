import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';

const { mockGetUser, mockOnAuthStateChange, mockFromFn } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockOnAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  const mockFromFn = vi.fn();
  return { mockGetUser, mockOnAuthStateChange, mockFromFn };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFromFn,
  },
}));

import { ClinicProvider, useClinic } from '@/contexts/ClinicContext';

function TestConsumer() {
  const ctx = useClinic();
  return createElement('div', null,
    createElement('span', { 'data-testid': 'clinicId' }, ctx.clinicId ?? 'null'),
    createElement('span', { 'data-testid': 'role' }, ctx.role ?? 'null'),
    createElement('span', { 'data-testid': 'isSuperAdmin' }, String(ctx.isSuperAdmin)),
    createElement('span', { 'data-testid': 'loading' }, String(ctx.loading)),
    createElement('span', { 'data-testid': 'userName' }, ctx.userName ?? 'null'),
    createElement('span', { 'data-testid': 'isAdmin' }, String(ctx.isAdmin)),
  );
}

describe('ClinicContext — logout state reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets all state to defaults when user is null (logged out)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(createElement(ClinicProvider, null, createElement(TestConsumer)));

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('clinicId').textContent).toBe('null');
    expect(screen.getByTestId('role').textContent).toBe('null');
    expect(screen.getByTestId('isSuperAdmin').textContent).toBe('false');
    expect(screen.getByTestId('userName').textContent).toBe('null');
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });
});
