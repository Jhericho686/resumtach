const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large. Maximum size is 10MB.'
    });
  }

  // Multer file type error
  if (err.message === 'Only PDF and DOCX files are allowed') {
    return res.status(400).json({ message: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired.' });
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate entry. This record already exists.' });
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Related record not found or cannot be deleted.' });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
