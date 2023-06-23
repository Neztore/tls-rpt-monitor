import express from 'express'
import { inspect } from 'util'

const app = express()
const port = process.env.port || 3000

app.post('/v1/tls-rpt', (req, res) => {
  console.log(inspect(req, true, null))
  res.status(204)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
