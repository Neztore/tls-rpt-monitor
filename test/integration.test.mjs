import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import app from '../app.mjs';

const gzip_promise = promisify(gzip);
const __dirname = dirname(fileURLToPath(import.meta.url));

const microsoftReportPath = join(__dirname, 'fixtures/microsoft-report.json');
// The .gz file lives in the main repo root, four directories above test/
const microsoftReportGzPath = join(
  __dirname,
  '../../../../microsoft.com!josh.scot!1754179200!1754265599!133988091029006454.json.gz'
);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('POST /v1/tls-rpt', () => {
  test('accepts the microsoft JSON fixture and returns 204', async () => {
    const body = await readFile(microsoftReportPath, 'utf8');
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/tlsrpt+json' },
      body,
    });
    assert.equal(res.status, 204);
  });

  test('accepts a valid gzip-compressed report and returns 204', async () => {
    const json = await readFile(microsoftReportPath, 'utf8');
    const compressed = await gzip_promise(Buffer.from(json));
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/tlsrpt+gzip' },
      body: compressed,
    });
    assert.equal(res.status, 204);
  });

  test('accepts the original microsoft .json.gz file and returns 204', async () => {
    const compressed = await readFile(microsoftReportGzPath);
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/tlsrpt+gzip' },
      body: compressed,
    });
    assert.equal(res.status, 204);
  });

  test('also accepts /v1/tlsrpt alias', async () => {
    const body = await readFile(microsoftReportPath, 'utf8');
    const res = await fetch(`${baseUrl}/v1/tlsrpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/tlsrpt+json' },
      body,
    });
    assert.equal(res.status, 204);
  });

  test('returns 400 for a report missing organization-name', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    delete report['organization-name'];
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.ok(Array.isArray(json.errors));
    assert.ok(json.errors.some(e => e.includes('organization-name')));
  });

  test('returns 400 for a report missing report-id', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    delete report['report-id'];
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
  });

  test('returns 400 for a report missing date-range', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    delete report['date-range'];
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.ok(json.errors.some(e => e.includes('date-range')));
  });

  test('returns 400 for a report with invalid start-datetime', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    report['date-range']['start-datetime'] = 'not-a-date';
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.ok(json.errors.some(e => e.includes('start-datetime')));
  });

  test('returns 400 for a report with empty policies array', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    report.policies = [];
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
  });

  test('returns 400 for a report with invalid policy-type', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    report.policies[0].policy['policy-type'] = 'invalid-type';
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.ok(json.errors.some(e => e.includes('policy-type')));
  });

  test('returns 400 for invalid JSON body', async () => {
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not valid json }',
    });
    assert.equal(res.status, 400);
  });

  test('returns 400 for an empty body', async () => {
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '',
    });
    assert.equal(res.status, 400);
  });

  test('returns 400 for a JSON array instead of object', async () => {
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '[]',
    });
    assert.equal(res.status, 400);
  });

  test('response includes structured errors for invalid report', async () => {
    const report = JSON.parse(await readFile(microsoftReportPath, 'utf8'));
    delete report['organization-name'];
    delete report['report-id'];
    const res = await fetch(`${baseUrl}/v1/tls-rpt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.ok(Array.isArray(json.errors));
    assert.equal(json.errors.length, 2);
  });
});
