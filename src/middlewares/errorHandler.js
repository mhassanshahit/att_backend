// Error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with more context
  console.error(`Error ${err.code || 'UNKNOWN'}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Prisma error handling
  if (err.code === 'P2002') {
    const message = 'Duplicate entry. This record already exists.';
    error = { message, statusCode: 409 };
  }

  if (err.code === 'P2025') {
    const message = 'Record not found.';
    error = { message, statusCode: 404 };
  }

  // Prisma connection errors
  if (err.code === 'P1001') {
    const message = 'Database connection failed.';
    error = { message, statusCode: 503 };
  }

  if (err.code === 'P1002') {
    const message = 'Database request timeout.';
    error = { message, statusCode: 503 };
  }

  // Prisma validation errors
  if (err.code === 'P2003') {
    const message = 'Foreign key constraint violation.';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'P2014') {
    const message = 'Invalid relation data.';
    error = { message, statusCode: 400 };
  }

  // JWT error handling
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token.';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired.';
    error = { message, statusCode: 401 };
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Multer error handling
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large.';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded.';
    error = { message, statusCode: 400 };
  }

  // MongoDB/Prisma ObjectId cast errors
  if (err.name === 'CastError' || (err.message && err.message.includes('ObjectId'))) {
    const message = 'Invalid ID format.';
    error = { message, statusCode: 400 };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.message,
      errorCode: err.code
    })
  });
};

module.exports = { errorHandler };
