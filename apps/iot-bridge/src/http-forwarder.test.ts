import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forward, ForwardError } from './http-forwarder.js';
import { dryRun } from './dry-run.js';
import { maskSecret } from './config.js';
import type { TelemetryIngest } from './telemetry-contract.js';

const dto: TelemetryIngest = {
  device_id: '018f3a2b-0001-7e2a-9b44-2f1d6c9a0e11',
  kit_id: '018f3a2b-0002-7e2a-9b44-2f1d6c9a0e22',
  installation_id: '018f3a2b-0003-7e2a-9b44-2f1d6c9a0e33',
  source_timestamp: '2026-06-01T13:45:05Z',
  active_power_w: 698.5,
  event_hash: 'b'.repeat(64),
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('forward', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hace POST al endpoint /iot/telemetry con el DTO', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const res = await forward(dto, { apiUrl: 'http://api.test', fetchImpl: fetchMock });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/iot/telemetry');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(dto);
    expect(init.headers['content-type']).toBe('application/json');
  });

  it('agrega header Bearer cuando hay token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    await forward(dto, { apiUrl: 'http://api.test', token: 'secret-token', fetchImpl: fetchMock });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.authorization).toBe('Bearer secret-token');
  });

  it('no agrega header authorization si no hay token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    await forward(dto, { apiUrl: 'http://api.test', fetchImpl: fetchMock });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.authorization).toBeUndefined();
  });

  it('normaliza apiUrl con trailing slash', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    await forward(dto, { apiUrl: 'http://api.test/', fetchImpl: fetchMock });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/iot/telemetry');
  });

  it('propaga ForwardError en error de red, sin filtrar el token', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      forward(dto, { apiUrl: 'http://api.test', token: 'super-secret', fetchImpl: fetchMock }),
    ).rejects.toBeInstanceOf(ForwardError);
    try {
      await forward(dto, { apiUrl: 'http://api.test', token: 'super-secret', fetchImpl: fetchMock });
    } catch (err) {
      expect((err as Error).message).not.toContain('super-secret');
    }
  });
});

describe('dryRun', () => {
  it('NO llama fetch y devuelve wouldSend', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = dryRun(dto);
    expect(res.wouldSend).toBe(true);
    expect(res.endpoint).toBe('/iot/telemetry');
    expect(res.event_hash).toBe(dto.event_hash);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('maskSecret', () => {
  it('oculta secretos y no revela el cuerpo', () => {
    expect(maskSecret(undefined)).toBe('<unset>');
    expect(maskSecret('')).toBe('<unset>');
    expect(maskSecret('abcd')).toBe('****');
    const masked = maskSecret('super-secret-token-value');
    expect(masked).not.toContain('secret');
    expect(masked).toContain('****');
  });
});
