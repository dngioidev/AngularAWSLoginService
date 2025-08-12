import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { S3Service } from '../../services/s3.service';

interface FileItem {
  name: string;
  path: string;
  url?: string;
  type: 'original' | 'compressed' | 'thumbnail' | 'results';
  size?: string;
  lastModified?: Date;
}

@Component({
  selector: 'app-file-browser',
  templateUrl: './file-browser.component.html',
  styleUrls: ['./file-browser.component.css']
})
export class FileBrowserComponent implements OnInit {
  searchForm: FormGroup;
  files: FileItem[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  
  // Predefined sample files based on the S3Upload.md examples
  sampleFiles: FileItem[] = [
    {
      name: 'quotation-q4-2025.xlsx',
      path: 'results/proj-alpha-789/quotation-q4-2025.xlsx',
      type: 'results'
    },
    {
      name: 'job-image-onsite.jpg',
      path: 'compress/proj-beta-123/job-beta-456/job-image-onsite.jpg',
      type: 'compressed'
    },
    {
      name: 'job-image-onsite_thumbnail.png',
      path: 'thumbnails/proj-beta-123/job-beta-456/job-image-onsite.jpg',
      type: 'thumbnail'
    },
    {
      name: 'report-figure-1.png',
      path: 'compress/proj-gamma-789/report-gamma-112/report-figure-1.png',
      type: 'compressed'
    },
    {
      name: 'report-figure-1_thumbnail.png',
      path: 'thumbnails/proj-gamma-789/report-gamma-112/report-figure-1.png',
      type: 'thumbnail'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private s3Service: S3Service
  ) {
    this.searchForm = this.fb.group({
      projectId: [''],
      jobId: [''],
      reportId: [''],
      fileType: [''],
      fileName: ['']
    });
  }

  ngOnInit(): void {
    this.loadSampleFiles();
    this.loadUploadedFiles();
  }

  loadSampleFiles(): void {
    this.files = [...this.sampleFiles];
    this.generatePreviewUrls();
  }

  loadUploadedFiles(): void {
    const uploadedFiles = JSON.parse(sessionStorage.getItem('uploadedFiles') || '[]');
    
    uploadedFiles.forEach((uploadInfo: any) => {
      this.addUploadedFile(uploadInfo.fileName, uploadInfo.metadata);
    });
  }

  async generatePreviewUrls(): Promise<void> {
    for (const file of this.files) {
      try {
        // For sample files, we'll use placeholder images instead of checking S3
        if (this.isImageFile(file)) {
          // Use a placeholder image URL for demo purposes
          file.url = this.getPlaceholderImageUrl(file);
        }
      } catch (error) {
        console.log(`File ${file.path} not found or error generating URL:`, error);
      }
    }
  }

  getPlaceholderImageUrl(file: FileItem): string {
    // Generate placeholder images based on file type and name
    const width = file.type === 'thumbnail' ? 150 : 300;
    const height = file.type === 'thumbnail' ? 100 : 200;
    const text = encodeURIComponent(file.name.split('.')[0]);
    return `https://via.placeholder.com/${width}x${height}/667eea/ffffff?text=${text}`;
  }

  async downloadFile(file: FileItem): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = null;

      const url = file.url || await this.s3Service.getFileUrl(file.path);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error: any) {
      console.error('Download error:', error);
      this.errorMessage = `Failed to download ${file.name}: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async previewFile(file: FileItem): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = null;

      const url = file.url || await this.s3Service.getFileUrl(file.path);
      
      // Open in new window for preview
      window.open(url, '_blank');

    } catch (error: any) {
      console.error('Preview error:', error);
      this.errorMessage = `Failed to preview ${file.name}: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  searchFiles(): void {
    const formValue = this.searchForm.value;
    let filteredFiles = [...this.sampleFiles];

    // Filter by project ID
    if (formValue.projectId) {
      filteredFiles = filteredFiles.filter(file => 
        file.path.includes(`/${formValue.projectId}/`)
      );
    }

    // Filter by job ID
    if (formValue.jobId) {
      filteredFiles = filteredFiles.filter(file => 
        file.path.includes(`/${formValue.jobId}/`)
      );
    }

    // Filter by report ID
    if (formValue.reportId) {
      filteredFiles = filteredFiles.filter(file => 
        file.path.includes(`/${formValue.reportId}/`)
      );
    }

    // Filter by file type
    if (formValue.fileType) {
      filteredFiles = filteredFiles.filter(file => 
        file.type === formValue.fileType
      );
    }

    // Filter by file name
    if (formValue.fileName) {
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(formValue.fileName.toLowerCase())
      );
    }

    this.files = filteredFiles;
    this.generatePreviewUrls();
  }

  resetSearch(): void {
    this.searchForm.reset();
    this.loadSampleFiles();
    this.errorMessage = null;
  }

  /**
   * Add uploaded file to the browser (for demo purposes)
   */
  addUploadedFile(fileName: string, metadata: any): void {
    const newFile: FileItem = {
      name: fileName,
      path: `originals/${fileName}`,
      type: 'original'
    };

    // Add to the beginning of the files array
    this.files.unshift(newFile);

    // Generate expected processed files based on metadata
    if (metadata.action === 'job' || metadata.action === 'report') {
      const compressedFile: FileItem = {
        name: fileName,
        path: `compress/${metadata.project_id}/${metadata.job_id || metadata.report_id}/${fileName}`,
        type: 'compressed'
      };
      
      // Generate thumbnail with documented structure: thumbnails/{project_id}/{job_id|report_id}/{original-filename}
      const thumbnailFile: FileItem = {
        name: `${fileName.replace(/\.[^/.]+$/, '')}_thumbnail.png`,
        path: `thumbnails/${metadata.project_id}/${metadata.job_id || metadata.report_id}/${fileName}`,
        type: 'thumbnail'
      };

      this.files.unshift(compressedFile, thumbnailFile);
    } else if (metadata.action === 'quotation') {
      const resultsFile: FileItem = {
        name: fileName.replace(/\.(xlsx|xls|csv)$/, '.json'),
        path: `results/${metadata.project_id}/${fileName.replace(/\.(xlsx|xls|csv)$/, '.json')}`,
        type: 'results'
      };

      this.files.unshift(resultsFile);
    }

    // Generate preview URLs for new files
    this.generatePreviewUrls();
  }

  getFileTypeIcon(file: FileItem): string {
    switch (file.type) {
      case 'original': return '📄';
      case 'compressed': return '🗜️';
      case 'thumbnail': return '🖼️';
      case 'results': return '📊';
      default: return '📁';
    }
  }

  getFileTypeClass(file: FileItem): string {
    switch (file.type) {
      case 'original': return 'file-original';
      case 'compressed': return 'file-compressed';
      case 'thumbnail': return 'file-thumbnail';
      case 'results': return 'file-results';
      default: return 'file-unknown';
    }
  }

  isImageFile(file: FileItem): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension || '');
  }

  getProjectIdFromPath(path: string): string {
    const parts = path.split('/');
    if (parts.length >= 3) {
      return parts[1]; // Assuming format: type/project-id/...
    }
    return 'Unknown';
  }

  copyPathToClipboard(path: string): void {
    navigator.clipboard.writeText(path).then(() => {
      // You could show a toast notification here
      console.log('Path copied to clipboard:', path);
    });
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }
}
