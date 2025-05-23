const fs = require('fs');
const path = require('path');

/**
 * Ensures that required directories for uploads exist
 */
const setupUploadDirectories = () => {
  const uploadDir = path.join(__dirname, '../uploads');
  
  // Create main uploads directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    console.log('Creating uploads directory...');
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  console.log('Upload directories setup complete');
};

module.exports = setupUploadDirectories;