const express = require('express');
const { authenticate } = require('./middlewares/auth');
const { requireRole } = require('./middlewares/roleAuth');
const multer = require('multer');
const path = require('path');

// Import controllers
const authController = require('./controllers/authController');
const employeeController = require('./controllers/employeeController');
const attendanceController = require('./controllers/attendanceController');
const uploadController = require('./controllers/uploadController');
const exportController = require('./controllers/exportController');

const router = express.Router();

// Multer configuration for file uploads
// Vercel uses ephemeral filesystem, so we use memory storage with base64 encoding
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Authentication routes
router.post('/auth/login', authController.login);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.me);

// Employee management routes
router.get('/employees', authenticate, employeeController.list);
router.post('/employees', authenticate, requireRole(['ADMIN']), upload.single('profileImage'), employeeController.create);
router.put('/employees/:id', authenticate, requireRole(['ADMIN']), upload.single('profileImage'), employeeController.update);
router.delete('/employees/:id', authenticate, requireRole(['ADMIN']), employeeController.remove);

// Attendance routes
router.post('/attendance/check-in', authenticate, upload.single('photoUrl'), attendanceController.checkIn);
router.post('/attendance/check-out', authenticate, upload.single('photoUrl'), attendanceController.checkOut);
router.get('/attendance', authenticate, attendanceController.list);
router.get('/attendance/stats', authenticate, requireRole(['ADMIN']), attendanceController.getStats);
router.get('/attendance/employee/:id', authenticate, attendanceController.getEmployeeHistory);

// File Upload routes
router.post('/upload/photo', authenticate, upload.single('photo'), uploadController.uploadPhoto);
router.get('/files/:filename', uploadController.getFile);

// Export routes
router.post('/export/csv', authenticate, requireRole(['ADMIN']), exportController.exportAttendanceCsv);
router.get('/export/templates', exportController.getTemplates);

module.exports = router;