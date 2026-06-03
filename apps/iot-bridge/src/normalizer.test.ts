import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize, NormalizationError } from './normalizer.js';
import { computeEventHash } from './telemetry-contract.js';

const FIXTURES = join(process.cwd(), 'fixtures');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

const baseMqtt = {
  device_id: '018f3a2b-0001-7e2a-9b44-2f1d6c9a0e11',
  kit_id: '018f3a2b-0002-7e2a-9b44-2f1d6c9a0e22',
  installation_id: '018f3a2b-0003-7e2a-9b44-2f1d6c9a0e33',
  source_timestamp: '2026-06-01T13:45:05Z',
  metrics: {
    voltage_v: 221.4,
    current_a: 3.182,
    active_power_w: 698.5,
    reactive_power_var: 102.3,
    apparent_power_va: 706.1,
    power_factor: 0.989,
    energy_wh_delta: 5.82,
    frequency_hz: 50.012,
  },
  signal_quality: -58,
  firmware_version: '1.4.2',
};

describe('normalize', () => {
  it('normaliza payload válido: mapea metrics a campos planos', () => {
    const dto = normalize(baseMqtt);
    expect(dto.device_id).toBe(baseMqtt.device_id);
    expect(dto.active_power_w).toBe(698.5);
    expect(dto.voltage_v).toBe(221.4);
    expect(dto.power_factor).toBe(0.989);
    expect(dto.signal_quality).toBe(-58);
    expect(dto.firmware_version).toBe('1.4.2');
    // No debe existir un sub-objeto metrics en el DTO plano.
    expect((dto as Record<string, unknown>).metrics).toBeUndefined();
  });

  it('conserva el objeto original en raw_payload', () => {
    const dto = normalize(baseMqtt);
    expect(dto.raw_payload).toEqual(baseMqtt);
  });

  it('genera event_hash cuando falta', () => {
    const dto = normalize(baseMqtt);
    expect(typeof dto.event_hash).toBe('string');
    expect(dto.event_hash).toHaveLength(64);
    const expected = computeEventHash({
      device_id: baseMqtt.device_id,
      source_timestamp: baseMqtt.source_timestamp,
      metrics: baseMqtt.metrics,
    });
    expect(dto.event_hash).toBe(expected);
  });

  it('event_hash estable: mismo input → mismo hash', () => {
    const a = normalize(baseMqtt);
    const b = normalize(structuredClone(baseMqtt));
    expect(a.event_hash).toBe(b.event_hash);
  });

  it('duplicate-reading produce el mismo event_hash que valid-reading', () => {
    const valid = normalize(loadFixture('valid-reading.json'));
    const dup = normalize(loadFixture('duplicate-reading.json'));
    expect(dup.event_hash).toBe(valid.event_hash);
  });

  it('rechaza active_power_w negativo', () => {
    expect(() =>
      normalize({ ...baseMqtt, metrics: { ...baseMqtt.metrics, active_power_w: -1 } }),
    ).toThrow(NormalizationError);
  });

  it('rechaza power_factor fuera de [-1, 1]', () => {
    expect(() =>
      normalize({ ...baseMqtt, metrics: { ...baseMqtt.metrics, power_factor: 1.5 } }),
    ).toThrow(NormalizationError);
    expect(() =>
      normalize({ ...baseMqtt, metrics: { ...baseMqtt.metrics, power_factor: -2 } }),
    ).toThrow(NormalizationError);
  });

  it('rechaza timestamp futuro (> now + 120s)', () => {
    const future = new Date(Date.now() + 1_000_000).toISOString();
    expect(() => normalize({ ...baseMqtt, source_timestamp: future })).toThrow(
      /futuro/,
    );
  });

  it('acepta forma plana (sin sub-objeto metrics)', () => {
    const flat = {
      device_id: baseMqtt.device_id,
      kit_id: baseMqtt.kit_id,
      installation_id: baseMqtt.installation_id,
      source_timestamp: baseMqtt.source_timestamp,
      active_power_w: 100.0,
    };
    const dto = normalize(flat);
    expect(dto.active_power_w).toBe(100.0);
    expect(dto.event_hash).toHaveLength(64);
  });

  it('lanza error claro si faltan identificadores', () => {
    expect(() =>
      normalize({ kit_id: baseMqtt.kit_id, source_timestamp: baseMqtt.source_timestamp }),
    ).toThrow(/device_id/);
  });
});
