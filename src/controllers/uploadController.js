const fs = require('fs');
const path = require('path');

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    // Validate file type (multer already filtered, but double-check)
    if (!req.file.mimetype.startsWith('image/')) {
      // Delete the uploaded file if it's not an image
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'Only image files are allowed' 
      });
    }

    // File is already saved to disk by multer, return the URL
    const photoUrl = `/api/files/uploads/${req.file.filename}`;
    
    console.log('Photo uploaded successfully:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      url: photoUrl
    });
    
    res.json({ 
      success: true,
      url: photoUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to upload photo',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ 
        success: false,
        message: 'Filename is required' 
      });
    }

    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid filename' 
      });
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, filename);
    
    // Verify the file exists and is within the uploads directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(uploadsDir)) {
      return res.status(404).json({ 
        success: false,
        message: 'File not found' 
      });
    }

    // Get file stats
    const stats = await fs.promises.stat(filePath);
    
    // Check if it's a file
    if (!stats.isFile()) {
      return res.status(400).json({ 
        success: false,
        message: 'Not a file' 
      });
    }

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json'
    }[ext] || 'application/octet-stream';

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    // Handle stream errors
    stream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'Error reading file' 
        });
      }
    });
  } catch (error) {
    console.error('Get file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};
