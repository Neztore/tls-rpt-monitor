import express from 'express'
import { inspect } from 'util'

config()
const app = express()
const port = process.env.port || 3000

app.get('/', (req, res) => {
  console.log(inspect(req, true, null))
  res.status(204)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
