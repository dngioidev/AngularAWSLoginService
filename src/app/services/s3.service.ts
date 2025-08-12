import { Injectable } from '@angular/core';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthService } from './auth.service';
import { StreamUtils } from './stream-utils';
import { environment } from '../../environments/environment';

export interface FileMetadata {
  action: 'quotation' | 'job' | 'report';
  project_id?: string;
  job_id?: string;
  report_id?: string;
  user_id: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class S3Service {
  private s3Client: S3Client | null = null;
  private readonly bucketName = environment.s3.bucketName;
  private readonly region = environment.s3.region;

  constructor(private authService: AuthService) {}

  /**
   * Initialize S3 client with temporary AWS credentials from Cognito
   */
  private async initializeS3Client(): Promise<S3Client> {
    if (this.s3Client) {
      return this.s3Client;
    }

    try {
      const credentials = await this.authService.getAWSCredentials();
      
      if (!credentials) {
        throw new Error('Failed to get AWS credentials');
      }

      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: credentials.AccessKeyId!,
          secretAccessKey: credentials.SecretKey!,
          sessionToken: credentials.SessionToken!
        }
      });

      return this.s3Client;
    } catch (error) {
      console.error('Error initializing S3 client:', error);
      throw error;
    }
  }

  /**
   * Upload file to S3 with metadata for automated processing
   */
  async uploadFile(
    file: File, 
    metadata: FileMetadata, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      const s3Client = await this.initializeS3Client();
      
      // Generate file key for originals folder
      const fileKey = `originals/${file.name}`;
      
      // Prepare metadata headers
      const metadataHeaders: Record<string, string> = {
        'action': metadata.action,
        'user_id': metadata.user_id
      };

      // Add scenario-specific metadata
      if (metadata.action === 'quotation' && metadata.project_id) {
        metadataHeaders['project_id'] = metadata.project_id;
      } else if (metadata.action === 'job' && metadata.job_id) {
        metadataHeaders['job_id'] = metadata.job_id;
        if (metadata.project_id) {
          metadataHeaders['project_id'] = metadata.project_id;
        }
      } else if (metadata.action === 'report' && metadata.report_id) {
        metadataHeaders['report_id'] = metadata.report_id;
        if (metadata.project_id) {
          metadataHeaders['project_id'] = metadata.project_id;
        }
      }

      // Convert File to Uint8Array to avoid ReadableStream issues
      const fileData = await StreamUtils.fileToUint8Array(file);
      
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileData,
        ContentType: file.type,
        Metadata: metadataHeaders
      });

      // Simulate progress if callback provided
      if (onProgress) {
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => {
            onProgress({
              loaded: (file.size * i) / steps,
              total: file.size,
              percentage: (i / steps) * 100
            });
          }, i * 100);
        }
      }

      // Upload file
      await s3Client.send(putCommand);

      console.log(`File uploaded successfully: ${fileKey}`);
      return fileKey;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get pre-signed URL for file download
   */
  async getFileUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      const s3Client = await this.initializeS3Client();
      
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });

      const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Generate file paths for processed files based on metadata
   */
  generateProcessedPaths(originalFileName: string, metadata: FileMetadata): {
    compressed?: string;
    thumbnail?: string;
    results?: string;
  } {
    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.replace(/\.[^/.]+$/, '');
    
    const paths: any = {};

    if (metadata.action === 'quotation' && metadata.project_id) {
      paths.results = `results/${metadata.project_id}/${originalFileName}`;
    } else if (metadata.action === 'job' && metadata.job_id && metadata.project_id) {
      paths.compressed = `compress/${metadata.project_id}/${metadata.job_id}/${originalFileName}`;
      paths.thumbnail = `thumbnails/${metadata.project_id}/${metadata.job_id}/${originalFileName}`;
    } else if (metadata.action === 'report' && metadata.report_id && metadata.project_id) {
      paths.compressed = `compress/${metadata.project_id}/${metadata.report_id}/${originalFileName}`;
      paths.thumbnail = `thumbnails/${metadata.project_id}/${metadata.report_id}/${originalFileName}`;
    }

    return paths;
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const s3Client = await this.initializeS3Client();
      
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });

      await s3Client.send(getCommand);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Reset S3 client (useful when credentials are refreshed)
   */
  resetClient(): void {
    this.s3Client = null;
  }
}
