const fs = require('fs');
const path = require('path');

/**
 * Get file size in human-readable format
 * @param {number} bytes File size in bytes
 * @returns {string} Human-readable file size
 */
exports.getReadableFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

/**
 * Safely delete a file with error handling
 * @param {string} filePath Path to the file to delete
 * @returns {boolean} Success or failure
 */
exports.safelyDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file at ${filePath}:`, error);
    return false;
  }
};

/**
 * Get file extension from filename
 * @param {string} filename Name of the file
 * @returns {string} File extension (without dot)
 */
exports.getFileExtension = (filename) => {
  return path.extname(filename).slice(1);
};

/**
 * Check if a file is valid PDF
 * @param {Object} file File object from multer
 * @returns {boolean} Whether file is valid
 */
exports.isValidPdf = (file) => {
  return file.mimetype === 'application/pdf';
};