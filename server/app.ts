import express, { type NextFunction, type Request, type Response } from 'express'
import {
  createApplication,
  listApplications,
  NotFoundError,
  toApplicationInput,
  updateApplicationStatus,
  ValidationError,
} from './applicationRepository'

/** Builds the REST API. Express 5 passes errors from async handlers to the error handler below. */
export function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/api/applications', async (_req, res) => {
    res.json(await listApplications())
  })

  app.post('/api/applications', async (req, res) => {
    const created = await createApplication(toApplicationInput(req.body))
    res.status(201).json(created)
  })

  app.patch('/api/applications/:id/status', async (req, res) => {
    res.json(await updateApplicationStatus(req.params.id, req.body?.status))
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) return void res.status(400).json({ errors: err.errors })
    if (err instanceof NotFoundError) return void res.status(404).json({ error: err.message })
    if (err instanceof SyntaxError) return void res.status(400).json({ error: 'Request body must be valid JSON.' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on the server.' })
  })

  return app
}
