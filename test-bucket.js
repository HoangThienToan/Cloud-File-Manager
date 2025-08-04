const { PrismaClient } = require('@prisma/client')

async function testBucket() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Testing Bucket model...')
    const buckets = await prisma.bucket.findMany()
    console.log('Buckets found:', buckets.length)
    console.log('✅ Bucket model works!')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testBucket()
