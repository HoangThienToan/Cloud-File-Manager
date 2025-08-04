const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function checkFile() {
  try {
    const file = await prisma.file.findUnique({
      where: { id: '356e1806-f3c0-4b00-8bc4-8ae2f8852a2b' }
    });
    console.log('File in database:', JSON.stringify(file, null, 2));
    
    if (file) {
      const userFolder = file.userId || 'default';
      const storageName = file.storageName || file.name;
      const filePath = path.join(process.cwd(), 'uploads', userFolder, storageName);
      console.log('Expected file path:', filePath);
      console.log('File exists on disk:', fs.existsSync(filePath));
      
      // List files in user folder
      const userFolderPath = path.join(process.cwd(), 'uploads', userFolder);
      console.log('Files in user folder:');
      if (fs.existsSync(userFolderPath)) {
        const files = fs.readdirSync(userFolderPath);
        files.forEach(f => console.log('  -', f));
      } else {
        console.log('User folder does not exist');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFile();
