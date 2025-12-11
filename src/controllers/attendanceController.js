const prisma = require('../prisma/client');

// Helper function to resolve employee ID (handles both customId and ObjectId)
const resolveEmployeeId = async (employeeId) => {
  // First try to find by customId
  let employee = await prisma.employee.findUnique({
    where: { customId: employeeId }
  });
  
  // If not found, try by ObjectId
  if (!employee) {
    employee = await prisma.employee.findUnique({
      where: { employeeId: employeeId }
    });
  }
  
  return employee;
};

exports.checkIn = async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Handle both form-data and JSON requests
    let photoUrl = null;
    if (req.file) {
      // File uploaded via form-data
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      // Photo URL provided in JSON
      photoUrl = req.body.photoUrl;
    }

    if (!employeeId) {
      return res.status(400).json({ 
        success: false,
        message: 'Employee ID required' 
      });
    }

    // Resolve employee ID (handles both customId and ObjectId)
    const employee = await resolveEmployeeId(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.employeeId,
        action: 'CHECK_IN',
        timestamp: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingCheckIn) {
      return res.status(400).json({ 
        success: false,
        message: 'Already checked in today' 
      });
    }

    const attendance = await prisma.attendance.create({
      data: { 
        employeeId: employee.employeeId, 
        action: 'CHECK_IN', 
        timestamp: new Date(),
        photoUrl: photoUrl || null
      },
      include: {
        employee: true
      }
    });

    res.status(201).json({ success: true, attendance });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Handle both form-data and JSON requests
    let photoUrl = null;
    if (req.file) {
      // File uploaded via form-data
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      // Photo URL provided in JSON
      photoUrl = req.body.photoUrl;
    }

    if (!employeeId) {
      return res.status(400).json({ 
        success: false,
        message: 'Employee ID required' 
      });
    }

    // Resolve employee ID (handles both customId and ObjectId)
    const employee = await resolveEmployeeId(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    // Find today's check-in
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkIn = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.employeeId,
        action: 'CHECK_IN',
        timestamp: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (!checkIn) {
      return res.status(400).json({ 
        success: false,
        message: 'No check-in found for today' 
      });
    }

    // Check if already checked out
    const existingCheckOut = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.employeeId,
        action: 'CHECK_OUT',
        timestamp: {
          gte: checkIn.timestamp
        }
      }
    });

    if (existingCheckOut) {
      return res.status(400).json({ 
        success: false,
        message: 'Already checked out today' 
      });
    }

    const attendance = await prisma.attendance.create({
      data: { 
        employeeId: employee.employeeId, 
        action: 'CHECK_OUT', 
        timestamp: new Date(),
        photoUrl: photoUrl || null
      },
      include: {
        employee: true
      }
    });

    res.status(201).json({ success: true, attendance });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.list = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, page = 1, limit = 50 } = req.query;
    const where = {};
    
    if (employeeId) {
      const employee = await resolveEmployeeId(employeeId);
      if (employee) {
        where.employeeId = employee.employeeId;
      }
    }
    if (startDate || endDate) where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({ 
        where, 
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          employee: true
        }
      }),
      prisma.attendance.count({ where })
    ]);

    res.json({
      success: true,
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate || endDate) where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);

    const [
      totalRecords,
      checkIns,
      checkOuts,
      uniqueEmployees,
      presentToday
    ] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, action: 'CHECK_IN' } }),
      prisma.attendance.count({ where: { ...where, action: 'CHECK_OUT' } }),
      prisma.attendance.findMany({ 
        where, 
        select: { employeeId: true },
        distinct: ['employeeId']
      }).then(records => records.length),
      prisma.attendance.count({
        where: {
          action: 'CHECK_IN',
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalRecords,
        checkIns,
        checkOuts,
        uniqueEmployees,
        presentToday
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.getEmployeeHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    
    // Resolve employee ID (handles both customId and ObjectId)
    const employee = await resolveEmployeeId(id);
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }
    
    const where = { employeeId: employee.employeeId };
    if (startDate || endDate) where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({ 
        where, 
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit),
        include: { employee: true }
      }),
      prisma.attendance.count({ where })
    ]);

    res.json({
      success: true,
      employee,
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get employee history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};
