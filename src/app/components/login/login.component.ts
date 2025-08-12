import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  private subscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.subscription.add(
      this.authService.isAuthenticated$.subscribe(isAuthenticated => {
        console.log('Authentication state changed:', isAuthenticated);
        if (isAuthenticated) {
          console.log('User is authenticated, redirecting to home');
          this.router.navigate(['/home']);
        }
      })
    );

    // Debug: Check initial authentication state
    this.checkInitialAuthState();
  }

  private async checkInitialAuthState(): Promise<void> {
    try {
      const isAuthenticated = await this.authService.refreshAuthState();
      console.log('Initial authentication check:', isAuthenticated);
    } catch (error) {
      console.error('Error checking initial auth state:', error);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Handle form submission for username/password login
   */
  onSubmit(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.signIn(this.username, this.password).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          console.log('Login successful, checking authentication state...');
          
          // Add a small delay to ensure state is updated
          setTimeout(() => {
            if (this.authService.isAuthenticated()) {
              console.log('User is authenticated, navigating to home');
              this.router.navigate(['/home']);
            } else {
              console.log('User not authenticated after login, waiting for observable...');
            }
          }, 100);
        } else {
          // Check if there's a challenge
          this.authService.challenge$.subscribe(challenge => {
            if (challenge === 'NEW_PASSWORD_REQUIRED') {
              console.log('New password required, navigating to change password');
              this.router.navigate(['/change-password']);
            } else {
              this.errorMessage = 'Login failed. Please try again.';
            }
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);
        
        // Handle specific AWS Cognito errors
        switch (error.name) {
          case 'NotAuthorizedException':
            this.errorMessage = 'Incorrect username or password.';
            break;
          case 'UserNotConfirmedException':
            this.errorMessage = 'Account not verified. Redirecting to email verification...';
            // Redirect to verify email page with username
            setTimeout(() => {
              this.router.navigate(['/verify-email'], { 
                queryParams: { username: this.username } 
              });
            }, 1500);
            break;
          case 'UserNotFoundException':
            this.errorMessage = 'User not found. Please check your username.';
            break;
          case 'TooManyRequestsException':
            this.errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          default:
            this.errorMessage = error.message || 'An error occurred during login.';
        }
      }
    });
  }

  /**
   * Handle federated login with Microsoft
   */
  onFederatedSignIn(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.federatedSignIn().subscribe({
      next: () => {
        // The redirect will happen automatically
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Federated sign-in error:', error);
        this.errorMessage = 'Failed to initiate Microsoft sign-in.';
      }
    });
  }

  /**
   * Clear error message when user starts typing
   */
  clearError(): void {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }
}
