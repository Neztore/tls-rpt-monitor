import express from 'express'
import { inspect } from 'util'
import {join, dirname} from 'path'
import { fileURLToPath } from 'url'
import {reportIssue} from "./alerts.mjs";
import { promisify } from 'node:util'
import { unzip } from "node:zlib"
import getRawBody from 'raw-body'

const app = express()
const port = process.env.port || 3000

app.use((req, res, next) => {
  if (!req.get("content-type").endsWith("gzip")) return next();

  getRawBody(req)
    .then(buf => do_unzip(buf))
    .then((buf) => buf.toString())
    .then(body => {
      req.body = JSON.parse(body)
      next()
    })
    .catch((err) => {
      console.error('Decompression error:', err);
      next(err)
    });
})


app.disable("x-powered-by")


const do_unzip = promisify(unzip);


app.get("/", (req, res) => {
  const path = join(dirname(fileURLToPath(import.meta.url)),  "index.html")
  res.sendFile(path);
})

app.post('/v1/tls-rpt', (req, res) => {
  console.log(inspect(req.body, true, null))

  // Process request body
  const { "organization-name": orgName, "contact-info": contactInfo, "report-id": reportId,
  policies, "date-range": dateRange
  } = req.body

  // TODO: Perform validation

  if (policies && Array.isArray(policies)) {
    for (const policy of policies) {
      const {summary, "failure-details": failureDetails } = policy;
      const {"total-successful-session-count": successCount, "total-failure-session-count": failureCount } = summary

      console.log(`${orgName}: Success: ${successCount}, Failure: ${failureCount}.`)

      if (failureDetails && Array.isArray(failureDetails) && failureDetails.length > 0) {
        // There are some failures to report
        const range = {startTime: new Date(dateRange["start-datetime"]), endTime: new Date(dateRange["start-datetime"])}

        reportIssue({orgName, reportId, contactInfo}, range,
          {successCount, failCount: failureCount}, failureDetails)
      }

    }
  }








  return res.status(204).send()
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
