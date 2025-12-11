const bcrypt = require('bcrypt');
const prisma = require('../prisma/client');

async function main() {
  try {
    console.log('Starting database seeding...');

    // Create hardcoded admin user (ID: 999)
    const hardcodedAdminPassword = await bcrypt.hash('Admin123', 12);
    let hardcodedAdmin = await prisma.user.findUnique({
      where: { id: '666666666666666666666999' }
    });

    if (!hardcodedAdmin) {
      hardcodedAdmin = await prisma.user.create({
        data: {
          id: '666666666666666666666999', // 24-character hex string ending in 999
          email: 'sultanranait@gmail.com',
          passwordHash: hardcodedAdminPassword,
          role: 'ADMIN'
        }
      });
      console.log('Hardcoded Admin user created:', {
        id: hardcodedAdmin.id,
        email: hardcodedAdmin.email,
        role: hardcodedAdmin.role
      });
    } else {
      hardcodedAdmin = await prisma.user.update({
        where: { id: '666666666666666666666999' },
        data: {
          email: 'sultanranait@gmail.com',
          passwordHash: hardcodedAdminPassword,
          role: 'ADMIN'
        }
      });
      console.log('Hardcoded Admin user updated:', {
        id: hardcodedAdmin.id,
        email: hardcodedAdmin.email,
        role: hardcodedAdmin.role
      });
    }

    // Create hardcoded user (ID: 998)
    const hardcodedUserPassword = await bcrypt.hash('User123', 12);
    let hardcodedUser = await prisma.user.findUnique({
      where: { id: '666666666666666666666998' }
    });

    if (!hardcodedUser) {
      hardcodedUser = await prisma.user.create({
        data: {
          id: '666666666666666666666998', // 24-character hex string ending in 998
          email: 'sultanranait+user@gmail.com', // Different email to avoid conflict
          passwordHash: hardcodedUserPassword,
          role: 'USER'
        }
      });
      console.log('Hardcoded User created:', {
        id: hardcodedUser.id,
        email: hardcodedUser.email,
        role: hardcodedUser.role
      });
    } else {
      hardcodedUser = await prisma.user.update({
        where: { id: '666666666666666666666998' },
        data: {
          email: 'sultanranait+user@gmail.com',
          passwordHash: hardcodedUserPassword,
          role: 'USER'
        }
      });
      console.log('Hardcoded User updated:', {
        id: hardcodedUser.id,
        email: hardcodedUser.email,
        role: hardcodedUser.role
      });
    }

    // Create legacy admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@attendance.com' },
      update: { 
        passwordHash: adminPassword,
        role: 'ADMIN'
      },
      create: {
        email: 'admin@attendance.com',
        passwordHash: adminPassword,
        role: 'ADMIN'
      }
    });

    console.log('Legacy Admin user created/updated:', {
      id: admin.id,
      email: admin.email,
      role: admin.role
    });

    // Create sample employees
    const employees = [
      { name: 'John Doe', designation: 'Software Engineer', status: 'ACTIVE' },
      { name: 'Jane Smith', designation: 'Project Manager', status: 'ACTIVE' },
      { name: 'Mike Johnson', designation: 'UI/UX Designer', status: 'ACTIVE' }
    ];

    for (const emp of employees) {
      const existingEmployee = await prisma.employee.findFirst({
        where: { name: emp.name }
      });
      
      if (!existingEmployee) {
        await prisma.employee.create({ data: emp });
        console.log(`Created employee: ${emp.name}`);
      } else {
        await prisma.employee.update({
          where: { employeeId: existingEmployee.employeeId },
          data: emp
        });
        console.log(`Updated employee: ${emp.name}`);
      }
    }

    console.log(`Created/updated ${employees.length} employees`);

    // Log summary
    const userCount = await prisma.user.count();
    const employeeCount = await prisma.employee.count();
    
    console.log('Database seeding completed successfully!', {
      users: userCount,
      employees: employeeCount
    });

    console.log('\n=== SEEDING COMPLETED ===');
    console.log('Hardcoded Admin login: sultanranait@gmail.com / Admin123');
    console.log('Hardcoded User login: sultanranait@gmail.com / User123');
    console.log('Legacy Admin login: admin@attendance.com / admin123');
    console.log('Health Check: http://localhost:3001/health');

  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
