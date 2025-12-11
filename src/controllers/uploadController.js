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

    // Validate file type
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

    const photoUrl = `/uploads/${req.file.filename}`;
    
    console.log('Photo uploaded successfully:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
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
        message: 'Filename required' 
      });
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        message: 'File not found' 
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve file' 
    });
  }
};
