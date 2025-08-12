import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-aws-credentials',
  templateUrl: './aws-credentials.component.html',
  styleUrls: ['./aws-credentials.component.css']
})
export class AwsCredentialsComponent implements OnInit {
  identityId: string = '';
  credentials: any = null;
  isLoadingIdentityId: boolean = false;
  isLoadingCredentials: boolean = false;
  isLoadingRefresh: boolean = false;
  identityError: string = '';
  credentialsError: string = '';
  refreshError: string = '';
  
  // Token refresh data
  refreshResult: any = null;
  oldTokens: any = null;
  newTokens: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  getIdentityId(): void {
    this.isLoadingIdentityId = true;
    this.identityError = '';

    this.authService.getIdentityId().subscribe({
      next: (identityId) => {
        this.isLoadingIdentityId = false;
        this.identityId = identityId;
      },
      error: (error) => {
        this.isLoadingIdentityId = false;
        console.error('Get identity ID error:', error);
        this.identityError = error.message || 'Failed to get identity ID';
      }
    });
  }

  getImplicitToken(): void {
    this.isLoadingCredentials = true;
    this.credentialsError = '';

    this.authService.getImplicitToken().subscribe({
      next: (credentials) => {
        this.isLoadingCredentials = false;
        this.credentials = credentials;
      },
      error: (error) => {
        this.isLoadingCredentials = false;
        console.error('Get implicit token error:', error);
        this.credentialsError = error.message || 'Failed to get AWS credentials';
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show temporary success message
      const originalText = text;
      setTimeout(() => {
        // Could show a toast notification here
      }, 1000);
    });
  }

  async refreshTokensManual(): Promise<void> {
    this.isLoadingRefresh = true;
    this.refreshError = '';
    this.refreshResult = null;

    try {
      const result = await this.authService.manualRefreshTokens();
      this.refreshResult = result;
      
      if (result.success) {
        this.oldTokens = result.oldTokens;
        this.newTokens = result.newTokens;
        
        // Also refresh AWS credentials with new tokens
        setTimeout(() => {
          this.getImplicitToken();
        }, 500);
      } else {
        this.refreshError = result.error || 'Token refresh failed';
      }
    } catch (error: any) {
      this.refreshError = error.message || 'Failed to refresh tokens';
      console.error('Manual token refresh error:', error);
    } finally {
      this.isLoadingRefresh = false;
    }
  }

  clearRefreshResults(): void {
    this.refreshResult = null;
    this.oldTokens = null;
    this.newTokens = null;
    this.refreshError = '';
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  globalSignOut(): void {
    if (confirm('Are you sure you want to sign out from all devices? This will end all your sessions.')) {
      this.authService.globalSignOut().subscribe({
        next: (result) => {
          if (result) {
            // User will be redirected to login by the service
          }
        },
        error: (error) => {
          console.error('Global sign out error:', error);
          // Still try to navigate to login
          this.router.navigate(['/login']);
        }
      });
    }
  }
}
