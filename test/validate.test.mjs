import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { validateReport } from '../validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const microsoftReport = JSON.parse(
  await readFile(join(__dirname, 'fixtures/microsoft-report.json'), 'utf8')
);

describe('validateReport', () => {
  describe('valid reports', () => {
    test('accepts the microsoft report fixture', () => {
      const result = validateReport(microsoftReport);
      assert.equal(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
      assert.deepEqual(result.errors, []);
    });

    test('accepts a minimal valid report with no failure-details', () => {
      const report = {
        'organization-name': 'Test Corp',
        'date-range': {
          'start-datetime': '2024-01-01T00:00:00Z',
          'end-datetime': '2024-01-01T23:59:59Z',
        },
        'contact-info': 'mailto:tls@test.example',
        'report-id': 'report-001',
        'policies': [
          {
            'policy': {
              'policy-type': 'sts',
              'policy-string': ['version: STSv1'],
              'policy-domain': 'test.example',
            },
            'summary': {
              'total-successful-session-count': 10,
              'total-failure-session-count': 0,
            },
          },
        ],
      };
      const result = validateReport(report);
      assert.equal(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
    });

    test('accepts all valid policy-type values', () => {
      for (const policyType of ['tlsa', 'sts', 'no-policy-found']) {
        const report = {
          'organization-name': 'Test Corp',
          'date-range': { 'start-datetime': '2024-01-01T00:00:00Z', 'end-datetime': '2024-01-01T23:59:59Z' },
          'contact-info': 'mailto:tls@test.example',
          'report-id': 'report-001',
          'policies': [{
            'policy': { 'policy-type': policyType, 'policy-string': [], 'policy-domain': 'test.example' },
            'summary': { 'total-successful-session-count': 0, 'total-failure-session-count': 0 },
          }],
        };
        const result = validateReport(report);
        assert.equal(result.valid, true, `policy-type "${policyType}" should be valid`);
      }
    });

    test('accepts optional fields in failure-details', () => {
      const report = {
        ...microsoftReport,
        policies: [{
          ...microsoftReport.policies[0],
          'failure-details': [{
            'result-type': 'starttls-not-supported',
            'sending-mta-ip': '192.0.2.1',
            'failed-session-count': 1,
            'receiving-ip': '198.51.100.5',
            'receiving-mx-hostname': 'mx.example.com',
            'additional-info-uri': 'https://example.com/info',
            'failure-reason-code': 'TLS_ERROR',
          }],
        }],
      };
      const result = validateReport(report);
      assert.equal(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
    });

    test('accepts multiple policies', () => {
      const policy = microsoftReport.policies[0];
      const report = { ...microsoftReport, policies: [policy, policy] };
      const result = validateReport(report);
      assert.equal(result.valid, true);
    });
  });

  describe('invalid top-level fields', () => {
    test('rejects non-object input', () => {
      assert.equal(validateReport(null).valid, false);
      assert.equal(validateReport('string').valid, false);
      assert.equal(validateReport([]).valid, false);
      assert.equal(validateReport(42).valid, false);
    });

    test('rejects missing organization-name', () => {
      const { 'organization-name': _, ...report } = microsoftReport;
      const result = validateReport(report);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('organization-name')));
    });

    test('rejects empty organization-name', () => {
      const result = validateReport({ ...microsoftReport, 'organization-name': '   ' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('organization-name')));
    });

    test('rejects missing report-id', () => {
      const { 'report-id': _, ...report } = microsoftReport;
      const result = validateReport(report);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('report-id')));
    });

    test('rejects missing contact-info', () => {
      const { 'contact-info': _, ...report } = microsoftReport;
      const result = validateReport(report);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('contact-info')));
    });

    test('rejects missing date-range', () => {
      const { 'date-range': _, ...report } = microsoftReport;
      const result = validateReport(report);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('date-range')));
    });

    test('rejects invalid start-datetime', () => {
      const result = validateReport({
        ...microsoftReport,
        'date-range': { 'start-datetime': 'not-a-date', 'end-datetime': '2024-01-01T23:59:59Z' },
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('start-datetime')));
    });

    test('rejects invalid end-datetime', () => {
      const result = validateReport({
        ...microsoftReport,
        'date-range': { 'start-datetime': '2024-01-01T00:00:00Z', 'end-datetime': 'not-a-date' },
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('end-datetime')));
    });

    test('rejects start-datetime after end-datetime', () => {
      const result = validateReport({
        ...microsoftReport,
        'date-range': { 'start-datetime': '2024-01-02T00:00:00Z', 'end-datetime': '2024-01-01T00:00:00Z' },
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('start-datetime') && e.includes('end-datetime')));
    });

    test('rejects missing policies', () => {
      const { policies: _, ...report } = microsoftReport;
      const result = validateReport(report);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('policies')));
    });

    test('rejects empty policies array', () => {
      const result = validateReport({ ...microsoftReport, policies: [] });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('policies')));
    });
  });

  describe('invalid policy fields', () => {
    const withPolicy = (overrides) => ({
      ...microsoftReport,
      policies: [{ ...microsoftReport.policies[0], ...overrides }],
    });

    const withPolicySubfield = (overrides) => withPolicy({
      policy: { ...microsoftReport.policies[0].policy, ...overrides },
    });

    test('rejects invalid policy-type', () => {
      const result = validateReport(withPolicySubfield({ 'policy-type': 'unknown-type' }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('policy-type')));
    });

    test('rejects non-array policy-string', () => {
      const result = validateReport(withPolicySubfield({ 'policy-string': 'not-an-array' }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('policy-string')));
    });

    test('rejects policy-string with non-string items', () => {
      const result = validateReport(withPolicySubfield({ 'policy-string': [1, 2, 3] }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('policy-string')));
    });

    test('rejects missing policy-domain', () => {
      const { 'policy-domain': _, ...policyWithout } = microsoftReport.policies[0].policy;
      const result = validateReport(withPolicy({ policy: policyWithout }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('policy-domain')));
    });

    test('rejects missing summary', () => {
      const report = JSON.parse(JSON.stringify(microsoftReport));
      delete report.policies[0].summary;
      const result = validateReport(report);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('summary')));
    });

    test('rejects negative session counts', () => {
      const result = validateReport(withPolicy({
        summary: { 'total-successful-session-count': -1, 'total-failure-session-count': 0 },
      }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('total-successful-session-count')));
    });

    test('rejects non-integer session counts', () => {
      const result = validateReport(withPolicy({
        summary: { 'total-successful-session-count': 1.5, 'total-failure-session-count': 0 },
      }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('total-successful-session-count')));
    });

    test('rejects non-array failure-details', () => {
      const result = validateReport(withPolicy({ 'failure-details': 'not-an-array' }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('failure-details')));
    });
  });

  describe('invalid failure-detail fields', () => {
    const withFailureDetail = (overrides) => ({
      ...microsoftReport,
      policies: [{
        ...microsoftReport.policies[0],
        'failure-details': [{ ...microsoftReport.policies[0]['failure-details'][0], ...overrides }],
      }],
    });

    test('rejects missing result-type', () => {
      const { 'result-type': _, ...detail } = microsoftReport.policies[0]['failure-details'][0];
      const result = validateReport({
        ...microsoftReport,
        policies: [{ ...microsoftReport.policies[0], 'failure-details': [detail] }],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('result-type')));
    });

    test('rejects missing sending-mta-ip', () => {
      const { 'sending-mta-ip': _, ...detail } = microsoftReport.policies[0]['failure-details'][0];
      const result = validateReport({
        ...microsoftReport,
        policies: [{ ...microsoftReport.policies[0], 'failure-details': [detail] }],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('sending-mta-ip')));
    });

    test('rejects missing failed-session-count', () => {
      const { 'failed-session-count': _, ...detail } = microsoftReport.policies[0]['failure-details'][0];
      const result = validateReport({
        ...microsoftReport,
        policies: [{ ...microsoftReport.policies[0], 'failure-details': [detail] }],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('failed-session-count')));
    });

    test('rejects negative failed-session-count', () => {
      const result = validateReport(withFailureDetail({ 'failed-session-count': -1 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('failed-session-count')));
    });

    test('rejects non-string additional-info-uri', () => {
      const result = validateReport(withFailureDetail({ 'additional-info-uri': 123 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('additional-info-uri')));
    });
  });
});
