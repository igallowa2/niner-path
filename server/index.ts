import { createApp } from './app'

const port = Number(process.env.PORT ?? 3001)

createApp().listen(port, () => {
  console.log(`Niner Path API running at http://localhost:${port}/api/applications`)
})
