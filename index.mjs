import express from 'express'
import { inspect } from 'util'
import {join, dirname} from 'path'
import { fileURLToPath } from 'url'
import parser from 'body-parser'
const {json} = parser

const app = express()
const port = process.env.port || 3000

app.use(json({
  inflate: true,
  limit: "10mb",
  type: ["application/tlsrpt+gzip", ["application/tlsrpt+json"]]
}))
app.disable("x-powered-by")

app.get("/", (req, res) => {
  const path = join(dirname(fileURLToPath(import.meta.url)),  "index.html")
  res.sendFile(path);
})

app.post('/v1/tls-rpt', (req, res) => {
  console.log(inspect(req.body, true, null))

  // Process request body
  const { "organization-name": orgName, "contact-info": contactInfo, "report-id": reportId,
  policies, summary, "failure-details": failureDetails
  } = req.body
  const {"total-successful-session-count": successCount, "total-failure-session-count": failureCount } = summary

  console.log(`${orgName}: Success: ${successCount}, Failure: ${failureCount}.`)

  if (failureDetails && Array.isArray(failureDetails) && failureDetails.length > 0) {
    // There are some failures to report
  }

  return res.status(204).send()
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
