import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClockCard } from '@/components/ponto/ClockCard';
import type { TimeEntry } from '@/utils/timesheet';

vi.mock('@/contexts/ClinicContext', () => ({ useClinic: () => ({ clinicId: 'c1' }) }));
vi.mock('@/hooks/useTimeEntries', () => ({
  useCreateTimeEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTimeEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { TimeEntryDialog } from '@/components/ponto/TimeEntryDialog';

function openEntry(clockIn: Date): TimeEntry {
  const iso = clockIn.toISOString();
  return {
    id: 'e1', clinic_id: 'c1', user_id: 'u1', clock_in: iso, clock_out: null,
    created_by: 'u1', updated_by: 'u1', created_at: iso, updated_at: iso,
  };
}

describe('ClockCard', () => {
  it('ponto aberto de dia anterior: sem botão Sair e com aviso para pedir ao admin', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);
    render(
      <ClockCard openEntry={openEntry(yesterday)} loading={false} pending={false} onClockIn={vi.fn()} onClockOut={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /sair/i })).toBeNull();
    expect(screen.getByText(/peça ao administrador/i)).toBeInTheDocument();
  });

  it('ponto aberto de hoje: mostra botão Sair', () => {
    const today = new Date();
    today.setHours(0, 1, 0, 0);
    render(
      <ClockCard openEntry={openEntry(today)} loading={false} pending={false} onClockIn={vi.fn()} onClockOut={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
  });
});

describe('TimeEntryDialog', () => {
  it('não apaga o que o admin digitou quando a página re-renderiza com novo defaultDate', () => {
    const { rerender } = render(
      <TimeEntryDialog open onOpenChange={vi.fn()} userId="u1" entry={null} defaultDate={new Date(2026, 7, 10)} />,
    );
    const input = screen.getByLabelText('Entrada') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '08:30' } });
    expect(input.value).toBe('08:30');

    rerender(
      <TimeEntryDialog open onOpenChange={vi.fn()} userId="u1" entry={null} defaultDate={new Date(2026, 7, 10)} />,
    );
    expect((screen.getByLabelText('Entrada') as HTMLInputElement).value).toBe('08:30');
  });
});
