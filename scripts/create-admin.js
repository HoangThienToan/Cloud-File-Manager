const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🗑️ Clearing database...')
    
    // Xóa tất cả dữ liệu theo thứ tự để tránh foreign key constraints
    await prisma.share.deleteMany({})
    console.log('✅ Deleted all shares')
    
    await prisma.file.deleteMany({})
    console.log('✅ Deleted all files')
    
    await prisma.folder.deleteMany({})
    console.log('✅ Deleted all folders')
    
    await prisma.user.deleteMany({})
    console.log('✅ Deleted all users')
    
    console.log('🧹 Database cleared successfully!')
    console.log('')

    // Hash password
    const hashedPassword = await bcrypt.hash('123456', 10)

    // Tạo user mới
    const user = await prisma.user.create({
      data: {
        email: 'toanthien978@gmail.com',
        username: 'admin',
        password: hashedPassword,
        fullName: 'Administrator'
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', user.email)
    console.log('👤 Username:', user.username)
    console.log('🔑 Password: 123456')
    console.log('')
    console.log('🌐 You can now login at: http://localhost:3000/login')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
