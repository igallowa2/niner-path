// Fills the local development database with the three sample applications.
// Run with: npm run db:seed  (this clears existing applications in YOUR local database only)
import { PrismaClient } from '@prisma/client'
import { sampleApplications } from '../src/lib/sampleData'

const prisma = new PrismaClient()

async function main() {
  await prisma.jobApplication.deleteMany()

  for (const app of sampleApplications) {
    await prisma.jobApplication.create({
      data: {
        company: app.company,
        role: app.role,
        location: app.location,
        jobType: app.jobType,
        industry: app.industry,
        deadline: app.deadline,
        status: app.status,
        postingUrl: app.postingUrl,
        timeline: { create: app.timeline.map((t) => ({ status: t.status, date: t.date })) },
      },
    })
  }

  console.log(`Seeded ${sampleApplications.length} sample applications.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
