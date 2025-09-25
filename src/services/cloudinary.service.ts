import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   * @param fileBuffer - The file buffer to upload
   * @param folder - The folder to upload to
   * @returns The uploaded file URL
   */
  static async uploadFile(
    fileBuffer: Buffer,
    folder: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `securedbank/kyc/${folder}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new Error('Failed to upload file to Cloudinary'));
          }
          if (!result?.secure_url) {
            return reject(new Error('No URL returned from Cloudinary'));
          }
          resolve(result.secure_url);
        }
      );

      // Create a readable stream from buffer and pipe to Cloudinary
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null); // Signals the end of the stream
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId - The public ID of the file to delete
   */
  static async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw new Error('Failed to delete file from Cloudinary');
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  static getPublicIdFromUrl(url: string): string {
    const matches = url.match(/upload\/v\d+\/(.+?)(\.\w+)?$/);
    if (!matches) {
      throw new Error('Invalid Cloudinary URL');
    }
    return matches[1];
  }
}

export default cloudinary;
