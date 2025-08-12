import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { S3Service, FileMetadata, UploadProgress } from '../../services/s3.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  uploadProgress: UploadProgress | null = null;
  isUploading = false;
  uploadResult: string | null = null;
  errorMessage: string | null = null;
  processedPaths: any = null;
  imagePreviewUrl: string | null = null;

  // Action types for file uploads
  actionTypes = [
    { value: 'quotation', label: 'Quotation', description: 'Upload quotation sheets' },
    { value: 'job', label: 'Job Image', description: 'Upload job-related images' },
    { value: 'report', label: 'Report Image', description: 'Upload report images' }
  ];

  constructor(
    private fb: FormBuilder,
    private s3Service: S3Service,
    private authService: AuthService,
    private router: Router
  ) {
    this.uploadForm = this.fb.group({
      action: ['', Validators.required],
      projectId: [''],
      jobId: [''],
      reportId: [''],
      userId: [this.getCurrentUserId(), Validators.required]
    });

    // Watch action changes to show/hide relevant fields
    this.uploadForm.get('action')?.valueChanges.subscribe(action => {
      this.updateFormValidators(action);
    });
  }

  private getCurrentUserId(): string {
    // Get user ID from auth service or local storage
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      return user.username || user.sub || 'unknown';
    }
    return 'unknown';
  }

  private updateFormValidators(action: string): void {
    const projectIdControl = this.uploadForm.get('projectId');
    const jobIdControl = this.uploadForm.get('jobId');
    const reportIdControl = this.uploadForm.get('reportId');

    // Clear all validators first
    projectIdControl?.clearValidators();
    jobIdControl?.clearValidators();
    reportIdControl?.clearValidators();

    // Set validators based on action
    if (action === 'quotation') {
      projectIdControl?.setValidators([Validators.required]);
    } else if (action === 'job') {
      projectIdControl?.setValidators([Validators.required]);
      jobIdControl?.setValidators([Validators.required]);
    } else if (action === 'report') {
      projectIdControl?.setValidators([Validators.required]);
      reportIdControl?.setValidators([Validators.required]);
    }

    // Update validity
    projectIdControl?.updateValueAndValidity();
    jobIdControl?.updateValueAndValidity();
    reportIdControl?.updateValueAndValidity();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.errorMessage = null;
      this.imagePreviewUrl = null;
      
      // Validate file type based on action
      const action = this.uploadForm.get('action')?.value;
      if (action && !this.isValidFileType(file, action)) {
        this.errorMessage = this.getFileTypeError(action);
        this.selectedFile = null;
        event.target.value = '';
        return;
      }

      // Generate image preview for image files
      if (this.isImageFile(file)) {
        this.generateImagePreview(file);
      }
    }
  }

  private isImageFile(file: File): boolean {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    return imageTypes.includes(file.type);
  }

  private generateImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreviewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  private isValidFileType(file: File, action: string): boolean {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    switch (action) {
      case 'quotation':
        return ['xlsx', 'xls', 'csv'].includes(fileExtension || '');
      case 'job':
      case 'report':
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '');
      default:
        return false;
    }
  }

  private getFileTypeError(action: string): string {
    switch (action) {
      case 'quotation':
        return 'Please select a valid spreadsheet file (.xlsx, .xls, .csv)';
      case 'job':
      case 'report':
        return 'Please select a valid image file (.jpg, .jpeg, .png, .gif, .bmp, .webp)';
      default:
        return 'Invalid file type';
    }
  }

  async onUpload(): Promise<void> {
    if (!this.selectedFile || !this.uploadForm.valid) {
      this.errorMessage = 'Please fill all required fields and select a file';
      return;
    }

    const formValue = this.uploadForm.value;
    const metadata: FileMetadata = {
      action: formValue.action,
      user_id: formValue.userId
    };

    // Add action-specific metadata
    if (formValue.action === 'quotation') {
      metadata.project_id = formValue.projectId;
    } else if (formValue.action === 'job') {
      metadata.project_id = formValue.projectId;
      metadata.job_id = formValue.jobId;
    } else if (formValue.action === 'report') {
      metadata.project_id = formValue.projectId;
      metadata.report_id = formValue.reportId;
    }

    try {
      this.isUploading = true;
      this.uploadProgress = null;
      this.errorMessage = null;
      this.uploadResult = null;

      const fileKey = await this.s3Service.uploadFile(
        this.selectedFile,
        metadata,
        (progress) => {
          this.uploadProgress = progress;
        }
      );

      this.uploadResult = `File uploaded successfully to: ${fileKey}`;
      
      // Generate expected processed file paths
      this.processedPaths = this.s3Service.generateProcessedPaths(
        this.selectedFile.name,
        metadata
      );

      // Store upload info in session storage for file browser
      const uploadInfo = {
        fileName: this.selectedFile.name,
        metadata: metadata,
        timestamp: new Date().toISOString()
      };
      
      const existingUploads = JSON.parse(sessionStorage.getItem('uploadedFiles') || '[]');
      existingUploads.push(uploadInfo);
      sessionStorage.setItem('uploadedFiles', JSON.stringify(existingUploads));

      // Reset form
      this.uploadForm.reset();
      this.uploadForm.patchValue({ userId: this.getCurrentUserId() });
      this.selectedFile = null;
      this.imagePreviewUrl = null;
      
      // Clear file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Show success message with option to browse files
      setTimeout(() => {
        if (confirm('File uploaded successfully! Would you like to browse uploaded files?')) {
          this.router.navigate(['/file-browser']);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      this.errorMessage = error.message || 'Failed to upload file';
    } finally {
      this.isUploading = false;
      setTimeout(() => {
        this.uploadProgress = null;
      }, 2000);
    }
  }

  isFieldRequired(fieldName: string): boolean {
    const action = this.uploadForm.get('action')?.value;
    
    switch (fieldName) {
      case 'projectId':
        return ['quotation', 'job', 'report'].includes(action);
      case 'jobId':
        return action === 'job';
      case 'reportId':
        return action === 'report';
      default:
        return false;
    }
  }

  getActionDescription(): string {
    const action = this.uploadForm.get('action')?.value;
    const actionType = this.actionTypes.find(type => type.value === action);
    return actionType?.description || '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
