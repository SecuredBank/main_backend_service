import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Configure multer disk storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Accept images and PDFs only
  if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/i)) {
    const error = new Error('Only image and PDF files are allowed!');
    return cb(error as unknown as null, false);
  }
  cb(null, true);
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for handling file uploads
export const uploadKycDocuments = upload.fields([
  { name: 'nationalId', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);

export default upload;