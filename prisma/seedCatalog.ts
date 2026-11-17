// Loads prisma/catalog.json (made by `npm run catalog:import`) into the database.
// Called from prisma/seed.ts. Clears and reloads only the catalog tables.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'

interface CatalogFile {
  catalogYear: string
  colleges: { code: string; name: string; catalogId: number | null }[]
  courses: {
    code: string
    catalogId: number | null
    prefix: string
    number: string
    title: string
    minCredits: number | null
    maxCredits: number | null
    creditsText: string
    description: string
    prerequisites: string
    corequisites: string
    restrictions: string
  }[]
  programs: {
    catalogId: number
    name: string
    type: string
    degree: string
    totalCredits: number | null
    catalogUrl: string
    collegeCode: string | null
    groups: {
      label: string
      level: number
      parentIndex: number | null
      minCredits: number | null
      maxCredits: number | null
      rule: string
      chooseCount: number | null
      chooseCredits: number | null
      notes: string
      courses: { code: string; slot: number; note: string }[]
    }[]
  }[]
}

const CATALOG_FILE = path.resolve('prisma/catalog.json')

export async function seedCatalog(prisma: PrismaClient) {
  if (!existsSync(CATALOG_FILE)) {
    console.log('No prisma/catalog.json yet, so the catalog was not seeded. Run `npm run catalog:import` first.')
    return
  }
  const data: CatalogFile = JSON.parse(readFileSync(CATALOG_FILE, 'utf8'))

  // Children first, because of foreign keys.
  await prisma.requirementCourse.deleteMany()
  await prisma.requirementGroup.deleteMany()
  await prisma.program.deleteMany()
  await prisma.course.deleteMany()
  await prisma.college.deleteMany()

  await prisma.college.createMany({ data: data.colleges })
  await prisma.course.createMany({ data: data.courses })

  for (const p of data.programs) {
    await prisma.$transaction(async (tx) => {
      const program = await tx.program.create({
        data: {
          catalogId: p.catalogId,
          catalogYear: data.catalogYear,
          name: p.name,
          type: p.type,
          degree: p.degree,
          totalCredits: p.totalCredits,
          catalogUrl: p.catalogUrl,
          collegeCode: p.collegeCode,
        },
      })
      // Groups are in page order and a parent always comes before its children.
      const groupIds: number[] = []
      for (const [i, g] of p.groups.entries()) {
        const group = await tx.requirementGroup.create({
          data: {
            programId: program.id,
            parentId: g.parentIndex === null ? null : groupIds[g.parentIndex],
            label: g.label,
            level: g.level,
            sortOrder: i,
            rule: g.rule,
            chooseCount: g.chooseCount,
            chooseCredits: g.chooseCredits,
            minCredits: g.minCredits,
            maxCredits: g.maxCredits,
            notes: g.notes,
          },
        })
        groupIds.push(group.id)
        if (g.courses.length) {
          await tx.requirementCourse.createMany({
            data: g.courses.map((c) => ({ groupId: group.id, courseCode: c.code, slot: c.slot, note: c.note })),
          })
        }
      }
    })
  }

  console.log(`Seeded the ${data.catalogYear} catalog: ${data.programs.length} programs, ${data.courses.length} courses.`)
}
