const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestBucket() {
  try {
    // Lấy user đầu tiên để test
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found. Please create a user first.');
      return;
    }
    
    console.log('Found user:', user.email);
    
    // Tạo bucket test
    const bucket = await prisma.bucket.create({
      data: {
        name: 'my-files',
        userId: user.id
      }
    });
    
    console.log('Created test bucket:', JSON.stringify(bucket, null, 2));
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Bucket "my-files" already exists');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestBucket();
