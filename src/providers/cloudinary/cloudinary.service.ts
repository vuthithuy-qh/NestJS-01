import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'petshop/cats',
  ): Promise<UploadApiResponse> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh (jpg, png, webp, gif)');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File ảnh không được vượt quá 5MB');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },  // Resize max 800x800
            { quality: 'auto' },                           // Tự động nén
            { fetch_format: 'auto' },                      // Tự động chọn format tốt nhất
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed: no result'));
          }
        },
      );

      // Pipe file buffer to cloudinary
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  // Lấy public_id từ URL cloudinary
  extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary')) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    // Bỏ version (v1234567890) và lấy phần còn lại, bỏ extension
    const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
    return pathAfterUpload.replace(/\.[^/.]+$/, '');
  }
}