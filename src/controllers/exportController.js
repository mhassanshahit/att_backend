const prisma = require('../prisma/client');

exports.exportAttendanceCsv = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.body;
    
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (startDate || endDate) where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: { timestamp: 'desc' }
    });

    // Convert to CSV format manually
    const csvHeaders = ['Employee ID', 'Employee Name', 'Designation', 'Action', 'Timestamp', 'Status', 'Photo URL'];
    const csvData = records.map(record => [
      record.employeeId,
      record.employee.name,
      record.employee.designation || '',
      record.action,
      record.timestamp.toISOString(),
      record.status,
      record.photoUrl || ''
    ]);

    let csv = csvHeaders.join(',') + '\n';
    csvData.forEach(row => {
      csv += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export attendance data' 
    });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'attendance-basic',
        name: 'Basic Attendance Report',
        description: 'Simple attendance records with employee details',
        fields: ['Employee ID', 'Employee Name', 'Action', 'Timestamp', 'Status']
      },
      {
        id: 'attendance-detailed',
        name: 'Detailed Attendance Report',
        description: 'Complete attendance records with photos and designations',
        fields: ['Employee ID', 'Employee Name', 'Designation', 'Action', 'Timestamp', 'Status', 'Photo URL']
      },
      {
        id: 'employee-summary',
        name: 'Employee Summary Report',
        description: 'Employee-wise attendance statistics and summaries',
        fields: ['Employee ID', 'Employee Name', 'Designation', 'Total Check-ins', 'Total Check-outs', 'Present Days']
      }
    ];

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get templates' 
    });
  }
};
