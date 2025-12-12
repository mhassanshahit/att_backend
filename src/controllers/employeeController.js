const prisma = require('../prisma/client');

exports.list = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, employees });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.get = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Try to find by customId first, then by employeeId (ObjectId)
    let employee = await prisma.employee.findUnique({ 
      where: { customId: id },
      include: { user: true }
    });
    
    if (!employee) {
      employee = await prisma.employee.findUnique({ 
        where: { employeeId: id },
        include: { user: true }
      });
    }
    
    if(!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }
    
    res.json({ success: true, employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, designation, status, userId, customId } = req.body;
    
    // Validate required fields
    if (!name || !designation || !customId) {
      return res.status(400).json({
        success: false,
        message: 'Name, designation, and customId are required'
      });
    }
    
    // Clean input data
    const cleanName = name.trim();
    const cleanDesignation = designation.trim();
    const cleanStatus = (status || 'ACTIVE').toUpperCase();
    const cleanCustomId = customId.trim();
    
    // Validate status enum
    const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];
    if (!validStatuses.includes(cleanStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Check if custom ID already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { customId: cleanCustomId }
    });
    
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Employee with this custom ID already exists'
      });
    }
    
    // Handle profile image
    let profileImagePath = null;
    if (req.file) {
      // File uploaded via form-data
      // Store canonical API path so frontend can use it directly
      profileImagePath = `/api/files/uploads/${req.file.filename}`;
    } else if (req.body.profileImage && req.body.profileImage.trim()) {
      // Handle local file URI (from React Native ImagePicker)
      const profileImageStr = req.body.profileImage.trim();
      if (profileImageStr.startsWith('file://')) {
        // For React Native file URIs, we'll store the URI as-is for now
        // Frontend should upload separately via /upload/photo endpoint
        profileImagePath = null; // Don't store file URI directly
      } else if (profileImageStr.startsWith('http')) {
        // HTTP URL - store as is
        profileImagePath = profileImageStr;
      } else {
        // Relative path - store as is
        profileImagePath = profileImageStr;
      }
    }
    
    // Prepare employee data
    const employeeData = {
      name: cleanName,
      designation: cleanDesignation,
      status: cleanStatus,
      customId: cleanCustomId
    };
    
    // Add userId if provided and valid
    if (userId) {
      employeeData.userId = userId;
    }
    
    // Add profileImage if provided
    if (profileImagePath) {
      employeeData.profileImage = profileImagePath;
    }
    
    const employee = await prisma.employee.create({ 
      data: employeeData,
      include: { user: true }
    });
    
    res.status(201).json({ success: true, employee });
  } catch (error) {
    console.error('Create employee error:', error);
    
    // Handle specific errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Employee with this ID already exists'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, designation, status, userId } = req.body;
    const id = req.params.id;
    
    // Prepare update data
    const updateData = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (designation !== undefined) {
      updateData.designation = designation.trim();
    }
    
    if (status !== undefined) {
      const cleanStatus = status.toUpperCase();
      const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];
      if (!validStatuses.includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      updateData.status = cleanStatus;
    }
    
    if (userId !== undefined) {
      updateData.userId = userId;
    }
    
    // Handle profile image
    if (req.file) {
      // File uploaded via form-data
      // Store canonical API path so frontend can use it directly
      updateData.profileImage = `/api/files/uploads/${req.file.filename}`;
    } else if (req.body.profileImage !== undefined) {
      // Profile image URL provided in JSON (for backward compatibility)
      if (req.body.profileImage.trim()) {
        const profileImageStr = req.body.profileImage.trim();
        if (profileImageStr.startsWith('file://')) {
          // For React Native file URIs, we'll ignore and not store
          updateData.profileImage = null;
        } else {
          updateData.profileImage = profileImageStr;
        }
      } else {
        updateData.profileImage = null; // Clear the profile image
      }
    }
    
    // Try to find by customId first, then by employeeId (ObjectId)
    let employee = await prisma.employee.findUnique({ 
      where: { customId: id }
    });
    
    const whereClause = employee ? { customId: id } : { employeeId: id };
    
    const updatedEmployee = await prisma.employee.update({
      where: whereClause,
      data: updateData,
      include: { user: true }
    });
    
    res.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    console.error('Update employee error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Try to find by customId first, then by employeeId (ObjectId)
    let employee = await prisma.employee.findUnique({ 
      where: { customId: id }
    });
    
    const whereClause = employee ? { customId: id } : { employeeId: id };
    
    // First, get the actual employee to find their real ObjectId
    const actualEmployee = await prisma.employee.findUnique({ 
      where: whereClause 
    });
    
    if (!actualEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Delete related attendance records first (cascade delete)
    await prisma.attendance.deleteMany({
      where: { employeeId: actualEmployee.employeeId }
    });
    
    // Now delete the employee
    await prisma.employee.delete({ where: whereClause });
    
    res.json({ 
      success: true,
      message: 'Employee deleted successfully' 
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
