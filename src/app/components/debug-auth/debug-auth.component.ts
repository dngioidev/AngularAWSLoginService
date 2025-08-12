import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-debug-auth',
  template: `
    <div style="padding: 20px; font-family: monospace;">
      <h2>Authentication Debug Console</h2>
      
      <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3>Environment Configuration</h3>
        <p><strong>Region:</strong> {{ config.region }}</p>
        <p><strong>User Pool ID:</strong> {{ config.userPoolId }}</p>
        <p><strong>Client ID:</strong> {{ config.userPoolClientId }}</p>
        <p><strong>Identity Pool ID:</strong> {{ config.identityPoolId }}</p>
        <p><strong>Has Client Secret:</strong> {{ hasClientSecret ? 'Yes' : 'No' }}</p>
      </div>

      <div style="background: #e8f4f8; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3>Current Auth State</h3>
        <p><strong>Is Authenticated:</strong> {{ isAuthenticated }}</p>
        <p><strong>Current User:</strong> {{ currentUser | json }}</p>
        <p><strong>Current Challenge:</strong> {{ currentChallenge || 'None' }}</p>
      </div>

      <div style="background: #fff2e8; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3>Stored Tokens</h3>
        <p><strong>Access Token:</strong> {{ hasAccessToken ? 'Present' : 'None' }}</p>
        <p><strong>ID Token:</strong> {{ hasIdToken ? 'Present' : 'None' }}</p>
        <p><strong>Refresh Token:</strong> {{ hasRefreshToken ? 'Present' : 'None' }}</p>
      </div>

      <div style="margin: 20px 0;">
        <h3>Quick Tests</h3>
        <button (click)="testConnection()" style="margin: 5px; padding: 10px 15px;">
          Test AWS Connection
        </button>
        <button (click)="clearTokens()" style="margin: 5px; padding: 10px 15px;">
          Clear All Tokens
        </button>
        <button (click)="refreshAuthState()" style="margin: 5px; padding: 10px 15px;">
          Refresh Auth State
        </button>
        <br>
        <input [(ngModel)]="testUsername" placeholder="Test Username" style="margin: 5px; padding: 8px;">
        <input [(ngModel)]="testPassword" type="password" placeholder="Test Password" style="margin: 5px; padding: 8px;">
        <button (click)="testBasicAuth()" style="margin: 5px; padding: 10px 15px; background: #007bff; color: white;">
          Test Basic Auth
        </button>
      </div>

      <div *ngIf="testResult" style="background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3>Test Result</h3>
        <pre>{{ testResult }}</pre>
      </div>
    </div>
  `
})
export class DebugAuthComponent {
  config = environment.amplify.Auth.Cognito;
  hasClientSecret = !!environment.cognito.clientSecret;
  isAuthenticated = false;
  currentUser: any = null;
  currentChallenge: string | null = null;
  hasAccessToken = false;
  hasIdToken = false;
  hasRefreshToken = false;
  testResult = '';
  testUsername = '';
  testPassword = '';

  constructor(private authService: AuthService) {
    this.updateState();
    
    // Subscribe to auth changes
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
      this.updateState();
    });
    
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
    
    this.authService.challenge$.subscribe(challenge => {
      this.currentChallenge = challenge;
    });
  }

  updateState(): void {
    this.hasAccessToken = !!localStorage.getItem('accessToken');
    this.hasIdToken = !!localStorage.getItem('idToken');
    this.hasRefreshToken = !!localStorage.getItem('refreshToken');
  }

  async testConnection(): Promise<void> {
    try {
      this.testResult = 'Testing AWS Cognito connection...';
      
      // Test basic AWS SDK connectivity
      const response = await fetch(`https://cognito-idp.${this.config.region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool'
        },
        body: JSON.stringify({
          UserPoolId: this.config.userPoolId
        })
      });
      
      if (response.ok || response.status === 400) {
        this.testResult = 'AWS Cognito endpoint is reachable.\\nRegion and User Pool ID appear to be correct.';
      } else {
        this.testResult = `AWS Cognito connection failed: ${response.status} ${response.statusText}`;
      }
    } catch (error: any) {
      this.testResult = `Connection test failed: ${error.message}`;
    }
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('challengeUsername');
    this.updateState();
    this.testResult = 'All tokens cleared.';
  }

  async refreshAuthState(): Promise<void> {
    try {
      const result = await this.authService.refreshAuthState();
      this.testResult = `Auth state refreshed. Authenticated: ${result}`;
      this.updateState();
    } catch (error: any) {
      this.testResult = `Auth state refresh failed: ${error.message}`;
    }
  }

  async testBasicAuth(): Promise<void> {
    if (!this.testUsername || !this.testPassword) {
      this.testResult = 'Please enter both username and password for testing.';
      return;
    }

    try {
      this.testResult = 'Testing basic authentication...';
      const response = await this.authService.testBasicAuth(this.testUsername, this.testPassword);
      
      if (response.AuthenticationResult) {
        this.testResult = `✅ Authentication successful!
Challenge: ${response.ChallengeName || 'None'}
Access Token: ${response.AuthenticationResult.AccessToken ? 'Present' : 'None'}
ID Token: ${response.AuthenticationResult.IdToken ? 'Present' : 'None'}
Refresh Token: ${response.AuthenticationResult.RefreshToken ? 'Present' : 'None'}`;
      } else if (response.ChallengeName) {
        this.testResult = `⚠️ Authentication requires challenge: ${response.ChallengeName}`;
      } else {
        this.testResult = `❌ Authentication failed - no result or challenge`;
      }
    } catch (error: any) {
      this.testResult = `❌ Authentication failed: ${error.name || 'Unknown Error'}
Message: ${error.message}
Details: ${JSON.stringify(error, null, 2)}`;
    }
  }
}
