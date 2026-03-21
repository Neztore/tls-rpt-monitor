/**
 * Validates a TLS-RPT JSON report against RFC 8460.
 * @param {unknown} report
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateReport(report) {
  const errors = [];

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { valid: false, errors: ['Report must be a JSON object'] };
  }

  if (typeof report['organization-name'] !== 'string' || report['organization-name'].trim() === '') {
    errors.push('"organization-name" is required and must be a non-empty string');
  }

  if (typeof report['report-id'] !== 'string' || report['report-id'].trim() === '') {
    errors.push('"report-id" is required and must be a non-empty string');
  }

  if (typeof report['contact-info'] !== 'string' || report['contact-info'].trim() === '') {
    errors.push('"contact-info" is required and must be a non-empty string');
  }

  const dateRange = report['date-range'];
  if (!dateRange || typeof dateRange !== 'object' || Array.isArray(dateRange)) {
    errors.push('"date-range" is required and must be an object');
  } else {
    const startValid = typeof dateRange['start-datetime'] === 'string' && !isNaN(Date.parse(dateRange['start-datetime']));
    const endValid = typeof dateRange['end-datetime'] === 'string' && !isNaN(Date.parse(dateRange['end-datetime']));

    if (!startValid) {
      errors.push('"date-range.start-datetime" is required and must be a valid RFC 3339 datetime string');
    }
    if (!endValid) {
      errors.push('"date-range.end-datetime" is required and must be a valid RFC 3339 datetime string');
    }
    if (startValid && endValid && Date.parse(dateRange['start-datetime']) > Date.parse(dateRange['end-datetime'])) {
      errors.push('"date-range.start-datetime" must not be after "date-range.end-datetime"');
    }
  }

  const policies = report['policies'];
  if (!Array.isArray(policies) || policies.length === 0) {
    errors.push('"policies" is required and must be a non-empty array');
  } else {
    for (let i = 0; i < policies.length; i++) {
      errors.push(...validatePolicy(policies[i], i));
    }
  }

  return { valid: errors.length === 0, errors };
}

const VALID_POLICY_TYPES = ['tlsa', 'sts', 'no-policy-found'];

function validatePolicy(policyObj, index) {
  const errors = [];
  const prefix = `policies[${index}]`;

  if (!policyObj || typeof policyObj !== 'object' || Array.isArray(policyObj)) {
    return [`${prefix} must be an object`];
  }

  const policy = policyObj['policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    errors.push(`${prefix}.policy is required and must be an object`);
  } else {
    if (!VALID_POLICY_TYPES.includes(policy['policy-type'])) {
      errors.push(`${prefix}.policy.policy-type must be one of: ${VALID_POLICY_TYPES.join(', ')}`);
    }
    if (!Array.isArray(policy['policy-string'])) {
      errors.push(`${prefix}.policy.policy-string is required and must be an array`);
    } else if (!policy['policy-string'].every(s => typeof s === 'string')) {
      errors.push(`${prefix}.policy.policy-string must contain only strings`);
    }
    if (typeof policy['policy-domain'] !== 'string' || policy['policy-domain'].trim() === '') {
      errors.push(`${prefix}.policy.policy-domain is required and must be a non-empty string`);
    }
    if ('mx-host' in policy && typeof policy['mx-host'] !== 'string') {
      errors.push(`${prefix}.policy.mx-host must be a string if present`);
    }
  }

  const summary = policyObj['summary'];
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    errors.push(`${prefix}.summary is required and must be an object`);
  } else {
    if (!Number.isInteger(summary['total-successful-session-count']) || summary['total-successful-session-count'] < 0) {
      errors.push(`${prefix}.summary.total-successful-session-count is required and must be a non-negative integer`);
    }
    if (!Number.isInteger(summary['total-failure-session-count']) || summary['total-failure-session-count'] < 0) {
      errors.push(`${prefix}.summary.total-failure-session-count is required and must be a non-negative integer`);
    }
  }

  const failureDetails = policyObj['failure-details'];
  if (failureDetails !== undefined) {
    if (!Array.isArray(failureDetails)) {
      errors.push(`${prefix}.failure-details must be an array if present`);
    } else {
      for (let j = 0; j < failureDetails.length; j++) {
        errors.push(...validateFailureDetail(failureDetails[j], index, j));
      }
    }
  }

  return errors;
}

function validateFailureDetail(detail, policyIndex, detailIndex) {
  const errors = [];
  const prefix = `policies[${policyIndex}].failure-details[${detailIndex}]`;

  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
    return [`${prefix} must be an object`];
  }

  if (typeof detail['result-type'] !== 'string' || detail['result-type'].trim() === '') {
    errors.push(`${prefix}.result-type is required and must be a non-empty string`);
  }

  if (typeof detail['sending-mta-ip'] !== 'string' || detail['sending-mta-ip'].trim() === '') {
    errors.push(`${prefix}.sending-mta-ip is required and must be a non-empty string`);
  }

  if (!Number.isInteger(detail['failed-session-count']) || detail['failed-session-count'] < 0) {
    errors.push(`${prefix}.failed-session-count is required and must be a non-negative integer`);
  }

  if ('receiving-ip' in detail && typeof detail['receiving-ip'] !== 'string') {
    errors.push(`${prefix}.receiving-ip must be a string if present`);
  }

  if ('receiving-mx-hostname' in detail && typeof detail['receiving-mx-hostname'] !== 'string') {
    errors.push(`${prefix}.receiving-mx-hostname must be a string if present`);
  }

  if ('additional-info-uri' in detail && typeof detail['additional-info-uri'] !== 'string') {
    errors.push(`${prefix}.additional-info-uri must be a string if present`);
  }

  if ('failure-reason-code' in detail && typeof detail['failure-reason-code'] !== 'string') {
    errors.push(`${prefix}.failure-reason-code must be a string if present`);
  }

  return errors;
}
