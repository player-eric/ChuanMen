import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

dotenv.config()

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    seed: 'npx tsx prisma/seed.ts',
  },
})
