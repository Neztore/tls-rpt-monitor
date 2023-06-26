import express from 'express'
import { inspect } from 'util'
import parser from 'body-parser'
const {json} = parser

const app = express()
const port = process.env.port || 3000

app.use(json({
  inflate: true,
  limit: "10mb",
  type: ["application/tlsrpt+gzip", ["application/tlsrpt+json"]]
}))

app.post('/v1/tls-rpt', (req, res) => {
  console.log(inspect(req.body, true, null))
  res.status(204).send()

  // Parse the request


  // Work out if it indicates an error
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
