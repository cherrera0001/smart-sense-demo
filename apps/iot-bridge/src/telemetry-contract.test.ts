import { describe, it, expect } from 'vitest';
import { validateIngest } from './telemetry-contract.js';

const validDto = {
  device_id: '018f3a2b-0001-7e2a-9b44-2f1d6c9a0e11',
  kit_id: '018f3a2b-0002-7e2a-9b44-2f1d6c9a0e22',
  installation_id: '018f3a2b-0003-7e2a-9b44-2f1d6c9a0e33',
  source_timestamp: '2026-06-01T13:45:05Z',
  active_power_w: 698.5,
  power_factor: 0.989,
  event_hash: 'a'.repeat(64),
};

describe('validateIngest', () => {
  it('acepta un DTO válido', () => {
    const res = validateIngest(validDto);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.device_id).toBe(validDto.device_id);
    }
  });

  it('rechaza active_power_w negativo con errores', () => {
    const res = validateIngest({ ...validDto, active_power_w: -5 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors.some((e) => e.path.includes('active_power_w'))).toBe(true);
    }
  });

  it('rechaza power_factor fuera de rango', () => {
    const res = validateIngest({ ...validDto, power_factor: 2 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.path.includes('power_factor'))).toBe(true);
    }
  });

  it('rechaza UUID inválido en device_id', () => {
    const res = validateIngest({ ...validDto, device_id: 'not-a-uuid' });
    expect(res.ok).toBe(false);
  });

  it('rechaza source_timestamp no ISO', () => {
    const res = validateIngest({ ...validDto, source_timestamp: '01-06-2026' });
    expect(res.ok).toBe(false);
  });

  it('rechaza payload no objeto', () => {
    const res = validateIngest(null);
    expect(res.ok).toBe(false);
  });
});
