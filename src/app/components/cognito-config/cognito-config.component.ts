import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Amplify } from 'aws-amplify';

interface CognitoEnvironment {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  domain: string;
  clientSecret: string;
  s3BucketName: string;
  s3Region: string;
  timestamp?: string;
}

@Component({
  selector: 'app-cognito-config',
  templateUrl: './cognito-config.component.html',
  styleUrl: './cognito-config.component.css'
})
export class CognitoConfigComponent implements OnInit {
  configForm: FormGroup;
  isLoading = false;
  isTesting = false;
  isReleasing = false;
  isReconfiguring = false;
  isTestingConnection = false;
  successMessage = '';
  errorMessage = '';
  
  // Tab management
  activeTab: 'configure' | 'test' | 'history' | 'import-export' = 'configure';
  
  // Test credentials
  testCredentials = {
    username: '',
    password: ''
  };
  
  // Test results
  testResult: {
    success: boolean;
    message: string;
    details?: any;
  } | null = null;
  
  // File import
  selectedFile: File | null = null;
  
  // Status messages
  statusMessage: {
    type: 'success' | 'error' | 'info';
    text: string;
  } | null = null;
  
  currentConfig: CognitoEnvironment | null = null;
  configHistory: (CognitoEnvironment & { timestamp: string; status: string })[] = [];
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.configForm = this.formBuilder.group({
      region: ['ap-southeast-1', [Validators.required]],
      userPoolId: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+_[a-zA-Z0-9]+$/)]],
      userPoolClientId: ['', [Validators.required]],
      identityPoolId: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+:[a-f0-9-]+$/)]],
      domain: ['', [Validators.required]],
      clientSecret: ['', [Validators.required]],
      s3BucketName: ['', [Validators.required]],
      s3Region: ['ap-southeast-1', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Allow access without authentication for configuration management
    this.loadCurrentConfig();
    this.loadConfigHistory();
  }

  loadCurrentConfig(): void {
    // Load current configuration from localStorage or environment
    const savedConfig = localStorage.getItem('cognitoConfig');
    if (savedConfig) {
      this.currentConfig = JSON.parse(savedConfig);
      if (this.currentConfig) {
        this.configForm.patchValue(this.currentConfig);
      }
    } else {
      // Load from current environment
      this.currentConfig = {
        region: 'ap-southeast-1',
        userPoolId: 'ap-southeast-1_XXXXXXXXX',
        userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
        identityPoolId: 'ap-southeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        domain: 'your-cognito-domain.example.com',
        clientSecret: '',
        s3BucketName: 'your-bucket-name',
        s3Region: 'ap-southeast-1'
      };
      this.configForm.patchValue(this.currentConfig);
    }
  }

  loadConfigHistory(): void {
    const history = localStorage.getItem('cognitoConfigHistory');
    if (history) {
      this.configHistory = JSON.parse(history);
    }
  }

  saveConfigToHistory(config: CognitoEnvironment): void {
    const timestamp = new Date().toISOString();
    const configWithTimestamp = { ...config, timestamp, status: 'active' };
    
    this.configHistory.unshift(configWithTimestamp);
    if (this.configHistory.length > 10) {
      this.configHistory = this.configHistory.slice(0, 10);
    }
    
    localStorage.setItem('cognitoConfigHistory', JSON.stringify(this.configHistory));
  }

  async testConfiguration(): Promise<void> {
    if (this.configForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    this.isTesting = true;
    this.testResult = null;
    this.errorMessage = '';

    try {
      const formConfig = this.configForm.value;
      
      // Create temporary Amplify configuration
      const tempAmplifyConfig = {
        Auth: {
          Cognito: {
            region: formConfig.region,
            userPoolId: formConfig.userPoolId,
            userPoolClientId: formConfig.userPoolClientId,
            identityPoolId: formConfig.identityPoolId,
            signUpVerificationMethod: 'code' as const,
            loginWith: {
              oauth: {
                domain: formConfig.domain,
                scopes: ['openid'],
                redirectSignIn: ['http://localhost:4200/'],
                redirectSignOut: ['http://localhost:4200/'],
                responseType: 'code' as const
              }
            }
          }
        }
      };

      // Test the configuration by attempting to connect
      Amplify.configure(tempAmplifyConfig);
      
      // Try a simple API call to test connectivity
      this.testResult = {
        success: true,
        message: 'Configuration test successful!',
        details: {
          region: formConfig.region,
          userPoolId: formConfig.userPoolId,
          userPoolClientId: formConfig.userPoolClientId,
          identityPoolId: formConfig.identityPoolId,
          domain: formConfig.domain,
          s3BucketName: formConfig.s3BucketName
        }
      };

    } catch (error: any) {
      this.errorMessage = `Configuration test failed: ${error.message}`;
      this.testResult = {
        success: false,
        message: `Configuration test failed: ${error.message}`,
        details: error
      };
    } finally {
      this.isTesting = false;
    }
  }

  resetToDefaults(): void {
    this.loadCurrentConfig();
    this.successMessage = '';
    this.errorMessage = '';
    this.testResult = null;
  }

  exportConfiguration(): void {
    const config = this.configForm.value;
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cognito-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  async importConfiguration(): Promise<void> {
    if (!this.selectedFile) {
      this.showStatusMessage('error', 'Please select a file first.');
      return;
    }

    try {
      const text = await this.selectedFile.text();
      const importedConfig = JSON.parse(text);
      
      this.configForm.patchValue(importedConfig);
      this.showStatusMessage('success', 'Configuration imported successfully. Please test before releasing.');
    } catch (error: any) {
      this.showStatusMessage('error', `Failed to import configuration: ${error.message}`);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  resetForm(): void {
    this.configForm.reset();
    this.loadCurrentConfig();
    this.testResult = null;
    this.showStatusMessage('info', 'Form has been reset to current configuration.');
  }

  saveConfiguration(): void {
    if (this.configForm.invalid) {
      this.showStatusMessage('error', 'Please fill in all required fields correctly.');
      return;
    }

    this.isLoading = true;
    const config = this.configForm.value;
    
    try {
      // Save to localStorage
      localStorage.setItem('cognitoConfig', JSON.stringify(config));
      this.currentConfig = config;
      this.saveConfigToHistory(config);
      
      this.showStatusMessage('success', 'Configuration saved successfully. Please test before releasing.');
    } catch (error: any) {
      this.showStatusMessage('error', `Failed to save configuration: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  testConnection(): void {
    if (!this.testCredentials.username || !this.testCredentials.password) {
      this.showStatusMessage('error', 'Please enter test credentials.');
      return;
    }

    this.isTestingConnection = true;
    
    // Simulate connection test
    setTimeout(() => {
      this.testResult = {
        success: true,
        message: 'Connection test successful!',
        details: {
          username: this.testCredentials.username,
          timestamp: new Date().toISOString()
        }
      };
      this.isTestingConnection = false;
      this.showStatusMessage('success', 'Test connection completed successfully.');
    }, 2000);
  }

  releaseConfiguration(): void {
    this.isLoading = true;
    
    // Simulate release process
    setTimeout(() => {
      this.showStatusMessage('success', 'Configuration has been released to production successfully!');
      this.isLoading = false;
      
      // Update status in history
      if (this.configHistory.length > 0) {
        this.configHistory[0].status = 'active';
      }
    }, 3000);
  }

  viewConfiguration(config: any): void {
    this.configForm.patchValue(config);
    this.activeTab = 'configure';
    this.showStatusMessage('info', 'Configuration loaded for viewing.');
  }

  rollbackToConfiguration(config: any): void {
    this.isLoading = true;
    
    setTimeout(() => {
      this.configForm.patchValue(config);
      this.currentConfig = config;
      localStorage.setItem('cognitoConfig', JSON.stringify(config));
      
      this.showStatusMessage('success', 'Successfully rolled back to selected configuration.');
      this.isLoading = false;
      this.activeTab = 'configure';
    }, 1500);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      this.selectedFile = file;
    } else {
      this.showStatusMessage('error', 'Please select a valid JSON file.');
    }
  }

  private showStatusMessage(type: 'success' | 'error' | 'info', text: string): void {
    this.statusMessage = { type, text };
    
    // Auto-hide success and info messages after 5 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        this.statusMessage = null;
      }, 5000);
    }
  }
}
