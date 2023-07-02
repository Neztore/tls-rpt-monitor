import express from 'express'
import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import {reportIssue} from "./alerts.mjs";
import {promisify} from 'node:util'
import {unzip} from "node:zlib"
import getRawBody from 'raw-body'
import config from "./config.mjs"

const {ignoredSenders} = config.config

const app = express()
const port = process.env.port || 3000

const do_unzip = promisify(unzip);


app.disable("x-powered-by")


app.get("/", (req, res) => {
  const path = join(dirname(fileURLToPath(import.meta.url)), "index.html")
  res.sendFile(path);
})


app.post('/v1/tls-rpt', (req, res, next) => {
  getRawBody(req)
    .then(buf => req.get("content-type").endsWith("gzip") ? do_unzip(buf) : buf)
    .then((buf) => buf.toString())
    .then(body => {
      req.body = JSON.parse(body)
      next()
    })
    .catch((err) => {
      console.error('Decompression error:', err);
      next(err)
    });
}, (req, res) => {

  // Process request body
  const {
    "organization-name": orgName, "contact-info": contactInfo, "report-id": reportId,
    policies, "date-range": dateRange
  } = req.body

  // TODO: Perform validation
  if (ignoredSenders.includes(orgName.toLowerCase())) return;

  if (policies && Array.isArray(policies)) {
    for (const policy of policies) {
      const {summary, "failure-details": failureDetails} = policy;
      const {"total-successful-session-count": successCount, "total-failure-session-count": failureCount} = summary

      console.log(`${orgName}: Success: ${successCount}, Failure: ${failureCount}.`)

      if (failureDetails && Array.isArray(failureDetails) && failureDetails.length > 0) {
        // There are some failures to report
        const range = {startTime: new Date(dateRange["start-datetime"]), endTime: new Date(dateRange["start-datetime"])}
        reportIssue(req.body, {orgName, reportId, contactInfo, domain: policy.policy["policy-domain"]}, range,
          {successCount, failCount: failureCount}, failureDetails)
      }

    }
  }


  return res.status(204).send()
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
