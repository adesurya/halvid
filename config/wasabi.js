// config/wasabi.js
const AWS = require('aws-sdk');
require('dotenv').config();

// Konfigurasi Wasabi Cloud Storage
const wasabiConfig = {
    accessKeyId: process.env.WASABI_ACCESS_KEY,
    secretAccessKey: process.env.WASABI_SECRET_KEY,
    endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
    region: process.env.WASABI_REGION || 'us-east-1',
    bucket: process.env.WASABI_BUCKET_NAME
};

// Validasi konfigurasi
if (!wasabiConfig.accessKeyId || !wasabiConfig.secretAccessKey || !wasabiConfig.bucket) {
    console.error('❌ Wasabi configuration missing. Please check your environment variables:');
    console.error('Required: WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET_NAME');
    process.exit(1);
}

// Setup AWS SDK untuk Wasabi
const s3 = new AWS.S3({
    accessKeyId: wasabiConfig.accessKeyId,
    secretAccessKey: wasabiConfig.secretAccessKey,
    endpoint: wasabiConfig.endpoint,
    region: wasabiConfig.region,
    s3ForcePathStyle: true, // Wasabi requires path-style URLs
    signatureVersion: 'v4'
});

class WasabiService {
    constructor() {
        this.s3 = s3;
        this.bucket = wasabiConfig.bucket;
    }

    // Upload file ke Wasabi
    async uploadFile(file, key, options = {}) {
        try {
            const uploadParams = {
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer || file,
                ContentType: options.contentType || file.mimetype || 'application/octet-stream',
                ACL: options.acl || 'public-read',
                Metadata: options.metadata || {}
            };

            console.log(`⬆️ Uploading file to Wasabi: ${key}`);
            const result = await this.s3.upload(uploadParams).promise();
            
            console.log(`✅ File uploaded successfully: ${result.Location}`);
            return {
                success: true,
                url: result.Location,
                key: result.Key,
                etag: result.ETag
            };
        } catch (error) {
            console.error('❌ Wasabi upload error:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    // Upload video dengan progress tracking
    async uploadVideo(file, key, progressCallback) {
        try {
            const uploadParams = {
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer || file,
                ContentType: file.mimetype || 'video/mp4',
                ACL: 'public-read',
                Metadata: {
                    'original-name': file.originalname || 'video',
                    'upload-date': new Date().toISOString(),
                    'file-size': (file.size || file.length).toString()
                }
            };

            console.log(`🎬 Uploading video to Wasabi: ${key}`);
            
            const upload = this.s3.upload(uploadParams);
            
            // Track upload progress
            if (progressCallback) {
                upload.on('httpUploadProgress', (progress) => {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    progressCallback(percent, progress.loaded, progress.total);
                });
            }

            const result = await upload.promise();
            
            console.log(`✅ Video uploaded successfully: ${result.Location}`);
            return {
                success: true,
                url: result.Location,
                key: result.Key,
                etag: result.ETag,
                size: file.size || file.length
            };
        } catch (error) {
            console.error('❌ Video upload error:', error);
            throw new Error(`Video upload failed: ${error.message}`);
        }
    }

    // Generate signed URL untuk upload langsung dari frontend
    async generatePresignedUploadUrl(key, contentType, expiresIn = 3600) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
                ACL: 'public-read',
                Expires: expiresIn
            };

            const url = await this.s3.getSignedUrlPromise('putObject', params);
            
            return {
                success: true,
                uploadUrl: url,
                fileUrl: `${wasabiConfig.endpoint}/${this.bucket}/${key}`,
                key: key
            };
        } catch (error) {
            console.error('❌ Error generating presigned URL:', error);
            throw new Error(`Failed to generate upload URL: ${error.message}`);
        }
    }

    // Generate signed URL untuk download/view
    async generatePresignedViewUrl(key, expiresIn = 3600) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: key,
                Expires: expiresIn
            };

            const url = await this.s3.getSignedUrlPromise('getObject', params);
            return url;
        } catch (error) {
            console.error('❌ Error generating view URL:', error);
            throw new Error(`Failed to generate view URL: ${error.message}`);
        }
    }

    // Delete file dari Wasabi
    async deleteFile(key) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: key
            };

            console.log(`🗑️ Deleting file from Wasabi: ${key}`);
            await this.s3.deleteObject(params).promise();
            
            console.log(`✅ File deleted successfully: ${key}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Delete error:', error);
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    // Get file info
    async getFileInfo(key) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: key
            };

            const result = await this.s3.headObject(params).promise();
            
            return {
                success: true,
                size: result.ContentLength,
                lastModified: result.LastModified,
                contentType: result.ContentType,
                etag: result.ETag,
                metadata: result.Metadata
            };
        } catch (error) {
            if (error.code === 'NotFound') {
                return { success: false, error: 'File not found' };
            }
            console.error('❌ Error getting file info:', error);
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }

    // List files dengan prefix
    async listFiles(prefix = '', maxKeys = 1000) {
        try {
            const params = {
                Bucket: this.bucket,
                Prefix: prefix,
                MaxKeys: maxKeys
            };

            const result = await this.s3.listObjectsV2(params).promise();
            
            return {
                success: true,
                files: result.Contents.map(file => ({
                    key: file.Key,
                    size: file.Size,
                    lastModified: file.LastModified,
                    etag: file.ETag,
                    url: `${wasabiConfig.endpoint}/${this.bucket}/${file.Key}`
                })),
                count: result.KeyCount,
                isTruncated: result.IsTruncated
            };
        } catch (error) {
            console.error('❌ Error listing files:', error);
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    // Generate unique key untuk file
    generateFileKey(originalName, folder = 'videos') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = originalName.split('.').pop();
        const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '-');
        
        return `${folder}/${timestamp}-${random}-${baseName}.${extension}`;
    }

    // Generate thumbnail key
    generateThumbnailKey(videoKey) {
        const baseName = videoKey.replace(/\.[^/.]+$/, "");
        return `${baseName}-thumbnail.jpg`;
    }

    // Check if bucket exists dan accessible
    async testConnection() {
        try {
            await this.s3.headBucket({ Bucket: this.bucket }).promise();
            console.log(`✅ Wasabi connection successful. Bucket: ${this.bucket}`);
            return { success: true, bucket: this.bucket };
        } catch (error) {
            console.error('❌ Wasabi connection failed:', error);
            return { 
                success: false, 
                error: error.message,
                bucket: this.bucket 
            };
        }
    }

    // Get storage statistics
    async getStorageStats() {
        try {
            const listResult = await this.listFiles('', 10000);
            
            if (listResult.success) {
                const totalSize = listResult.files.reduce((sum, file) => sum + file.size, 0);
                const videoFiles = listResult.files.filter(file => 
                    file.key.includes('/videos/') || file.key.endsWith('.mp4')
                );
                const imageFiles = listResult.files.filter(file => 
                    file.key.includes('/images/') || file.key.match(/\.(jpg|jpeg|png|gif)$/i)
                );

                return {
                    success: true,
                    totalFiles: listResult.files.length,
                    totalSize: totalSize,
                    totalSizeFormatted: this.formatFileSize(totalSize),
                    videoFiles: videoFiles.length,
                    imageFiles: imageFiles.length,
                    videoSize: videoFiles.reduce((sum, file) => sum + file.size, 0),
                    imageSize: imageFiles.reduce((sum, file) => sum + file.size, 0)
                };
            }
            
            return { success: false, error: 'Failed to get file list' };
        } catch (error) {
            console.error('❌ Error getting storage stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Bulk operations
    async deleteMultipleFiles(keys) {
        try {
            const objects = keys.map(key => ({ Key: key }));
            const params = {
                Bucket: this.bucket,
                Delete: {
                    Objects: objects,
                    Quiet: false
                }
            };

            const result = await this.s3.deleteObjects(params).promise();
            
            return {
                success: true,
                deleted: result.Deleted,
                errors: result.Errors
            };
        } catch (error) {
            console.error('❌ Bulk delete error:', error);
            throw new Error(`Bulk delete failed: ${error.message}`);
        }
    }
}

// Export instance
const wasabiService = new WasabiService();

module.exports = {
    wasabiService,
    WasabiService,
    wasabiConfig
};

// Test connection on module load
wasabiService.testConnection().catch(console.error);