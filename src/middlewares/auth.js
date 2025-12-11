const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Authorization token required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid authorization header format' 
      });
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
    
    next();
  } catch (error) {
    let message = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    }
    
    return res.status(401).json({ 
      success: false,
      message 
    });
  }
};

module.exports = {
  authenticate
};
