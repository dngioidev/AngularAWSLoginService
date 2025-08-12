import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-function-test',
  template: `
    <div class="test-container">
      <h3>Authentication Functions Test</h3>
      <div class="test-functions">
        <button (click)="testForgotPassword()" class="test-btn">Test Forgot Password</button>
        <button (click)="testConfirmForgotPassword()" class="test-btn">Test Confirm Forgot Password</button>
        <button (click)="testChangePassword()" class="test-btn">Test Change Password</button>
        <button (click)="testGlobalSignOut()" class="test-btn">Test Global Sign Out</button>
        <button (click)="testGetIdentityId()" class="test-btn">Test Get Identity ID</button>
        <button (click)="testGetImplicitToken()" class="test-btn">Test Get Implicit Token</button>
      </div>
      <div class="test-results">
        <h4>Test Results:</h4>
        <pre>{{ testResults }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .test-functions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 20px 0;
    }
    .test-btn {
      padding: 10px 15px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    .test-btn:hover {
      background: #0056b3;
    }
    .test-results {
      margin-top: 20px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    pre {
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
  `]
})
export class FunctionTestComponent implements OnInit {
  testResults: string = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.testResults = 'Ready to test authentication functions...\n\n';
  }

  testForgotPassword() {
    this.testResults += '🔍 Testing Forgot Password...\n';
    this.authService.forgotPassword('testuser@example.com').subscribe({
      next: (result) => {
        this.testResults += `✅ Forgot Password: ${result ? 'Success' : 'Failed'}\n\n`;
      },
      error: (error) => {
        this.testResults += `❌ Forgot Password Error: ${error.message}\n\n`;
      }
    });
  }

  testConfirmForgotPassword() {
    this.testResults += '🔍 Testing Confirm Forgot Password...\n';
    this.authService.confirmForgotPassword('testuser@example.com', '123456', 'NewPassword123!').subscribe({
      next: (result) => {
        this.testResults += `✅ Confirm Forgot Password: ${result ? 'Success' : 'Failed'}\n\n`;
      },
      error: (error) => {
        this.testResults += `❌ Confirm Forgot Password Error: ${error.message}\n\n`;
      }
    });
  }

  testChangePassword() {
    this.testResults += '🔍 Testing Change Password...\n';
    this.authService.changePassword('OldPassword123!', 'NewPassword123!').subscribe({
      next: (result) => {
        this.testResults += `✅ Change Password: ${result ? 'Success' : 'Failed'}\n\n`;
      },
      error: (error) => {
        this.testResults += `❌ Change Password Error: ${error.message}\n\n`;
      }
    });
  }

  testGlobalSignOut() {
    this.testResults += '🔍 Testing Global Sign Out...\n';
    this.authService.globalSignOut().subscribe({
      next: (result) => {
        this.testResults += `✅ Global Sign Out: ${result ? 'Success' : 'Failed'}\n\n`;
      },
      error: (error) => {
        this.testResults += `❌ Global Sign Out Error: ${error.message}\n\n`;
      }
    });
  }

  testGetIdentityId() {
    this.testResults += '🔍 Testing Get Identity ID...\n';
    this.authService.getIdentityId().subscribe({
      next: (identityId) => {
        this.testResults += `✅ Get Identity ID: ${identityId}\n\n`;
      },
      error: (error) => {
        this.testResults += `❌ Get Identity ID Error: ${error.message}\n\n`;
      }
    });
  }

  testGetImplicitToken() {
    this.testResults += '🔍 Testing Get Implicit Token...\n';
    this.authService.getImplicitToken().subscribe({
      next: (token) => {
        this.testResults += `✅ Get Implicit Token: ${JSON.stringify(token, null, 2)}\n\n`;
      },
      error: (error) => {
        this.testResults += `❌ Get Implicit Token Error: ${error.message}\n\n`;
      }
    });
  }
}
