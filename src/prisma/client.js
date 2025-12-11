const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    errorFormat: 'pretty'
  });
}

prisma = global.prisma;

module.exports = prisma;
