import express from 'express'
import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import {reportIssue} from "./alerts.mjs";
import {promisify} from 'node:util'
import {unzip} from "node:zlib"
import getRawBody from 'raw-body'
import config from "./config.mjs"
import {validateReport} from "./validate.mjs"

const {ignoredSenders} = config.config

const app = express()

const unzip_promise = promisify(unzip);

const do_unzip = async (buf) => {
  try {
    return await unzip_promise(buf);
  } catch (err) {
    console.log(`Failed to unzip: ${err}`);
    return buf;
  }
}

app.disable("x-powered-by")

app.get("/", (req, res) => {
  const path = join(dirname(fileURLToPath(import.meta.url)), "index.html")
  res.sendFile(path);
})

app.post(['/v1/tls-rpt', '/v1/tlsrpt'], (req, res, next) => {
  const contentType = req.get("content-type") || '';
  const willDecompress = contentType.endsWith("gzip");
  getRawBody(req)
    .then(buf => willDecompress ? do_unzip(buf) : buf)
    .then((buf) => buf.toString())
    .then(body => {
      req.body = JSON.parse(body)
      next()
    })
    .catch((err) => {
      console.error('Body parsing error:', err);
      next(err)
    });
}, (req, res) => {

  const result = validateReport(req.body);
  if (!result.valid) {
    return res.status(400).json({ errors: result.errors });
  }

  const {
    "organization-name": orgName, "contact-info": contactInfo, "report-id": reportId,
    policies, "date-range": dateRange
  } = req.body

  if (ignoredSenders.includes(orgName.toLowerCase())) {
    return res.status(204).send();
  }

  if (policies && Array.isArray(policies)) {
    for (const policy of policies) {
      const {summary, "failure-details": failureDetails} = policy;
      const {"total-successful-session-count": successCount, "total-failure-session-count": failureCount} = summary

      console.log(`${orgName}: Success: ${successCount}, Failure: ${failureCount}.`)

      if (failureDetails && Array.isArray(failureDetails) && failureDetails.length > 0) {
        const range = {startTime: new Date(dateRange["start-datetime"]), endTime: new Date(dateRange["end-datetime"])}
        reportIssue(req.body, {orgName, reportId, contactInfo, domain: policy.policy["policy-domain"]}, range,
          {successCount, failCount: failureCount}, failureDetails)
          .catch(err => console.error('Failed to send alert:', err));
      }
    }
  }

  return res.status(204).send()
})

// Return 400 for malformed request bodies instead of 500
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError || (err.type === 'entity.parse.failed')) {
    return res.status(400).json({ errors: ['Invalid or malformed request body'] });
  }
  next(err);
});

export default app;
