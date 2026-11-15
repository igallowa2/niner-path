import { PrismaClient } from '@prisma/client'

// One shared client for the whole server. Prisma reads DATABASE_URL from .env.
export const prisma = new PrismaClient()
