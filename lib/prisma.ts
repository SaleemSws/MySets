import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL
  
  if (!url) {
    console.error("❌ DATABASE_URL is missing!")
  }

  // ใช้ Pool จาก pg เพื่อจัดการการเชื่อมต่อ
  const pool = new pg.Pool({ connectionString: url })
  // สร้าง Adapter สำหรับ Prisma 7
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
