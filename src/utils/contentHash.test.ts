import { describe, it, expect } from 'vitest';
import { canonicalizeRecord, computeRecordHash } from './contentHash';

describe('canonicalizeRecord', () => {
  it('sorts fields alphabetically for procedure type', () => {
    const record = {
      value: 100,
      date: '2026-01-01',
      patient_id: 'abc-123',
      description: 'Limpeza',
      status: 'completed',
    };
    const result = canonicalizeRecord(record, 'procedure');
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);

    // Should include all procedure fields in order
    expect(keys[0]).toBe('budget_links');
    expect(keys[1]).toBe('date');
    expect(keys[2]).toBe('description');
  });

  it('replaces undefined fields with null', () => {
    const record = { patient_id: 'abc' };
    const result = canonicalizeRecord(record, 'procedure');
    const parsed = JSON.parse(result);

    expect(parsed.date).toBeNull();
    expect(parsed.value).toBeNull();
    expect(parsed.patient_id).toBe('abc');
  });

  it('trims string values', () => {
    const record = { description: '  Limpeza  ', patient_id: 'abc' };
    const result = canonicalizeRecord(record, 'procedure');
    const parsed = JSON.parse(result);

    expect(parsed.description).toBe('Limpeza');
  });

  it('ignores extra fields not in the schema', () => {
    const record = { patient_id: 'abc', extra_field: 'should be ignored' };
    const result = canonicalizeRecord(record, 'procedure');
    const parsed = JSON.parse(result);

    expect(parsed.extra_field).toBeUndefined();
  });

  it('throws for unknown record type', () => {
    expect(() => canonicalizeRecord({}, 'unknown')).toThrow('Unknown record type');
  });

  it('produces deterministic output regardless of input key order', () => {
    const a = { date: '2026-01-01', patient_id: 'abc', value: 100 };
    const b = { value: 100, patient_id: 'abc', date: '2026-01-01' };

    expect(canonicalizeRecord(a, 'procedure')).toBe(canonicalizeRecord(b, 'procedure'));
  });
});

describe('computeRecordHash', () => {
  it('returns a 64-character hex string (SHA-256)', async () => {
    const record = { patient_id: 'test', date: '2026-01-01' };
    const hash = await computeRecordHash(record, 'procedure');

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces same hash for same canonical input', async () => {
    const record = { patient_id: 'test', date: '2026-01-01', value: 50 };
    const hash1 = await computeRecordHash(record, 'procedure');
    const hash2 = await computeRecordHash(record, 'procedure');

    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different input', async () => {
    const a = { patient_id: 'test', value: 50 };
    const b = { patient_id: 'test', value: 100 };
    const hashA = await computeRecordHash(a, 'procedure');
    const hashB = await computeRecordHash(b, 'procedure');

    expect(hashA).not.toBe(hashB);
  });
});
