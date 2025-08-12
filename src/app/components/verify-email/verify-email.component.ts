import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  username: string = '';
  confirmationCode: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  fromFailedLogin: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get username from query params if available
    this.route.queryParams.subscribe(params => {
      if (params['username']) {
        this.username = params['username'];
        this.fromFailedLogin = true;
        this.successMessage = 'Please verify your email address to complete account setup.';
        
        // Automatically resend confirmation code for failed login attempts
        setTimeout(() => {
          this.autoResendCode();
        }, 1000);
      }
    });
  }

  /**
   * Automatically resend confirmation code (silent operation)
   */
  private autoResendCode(): void {
    if (!this.username) return;

    this.authService.resendConfirmationCode(this.username.trim()).subscribe({
      next: (success) => {
        if (success) {
          this.successMessage = 'A new verification code has been sent to your email address.';
        }
      },
      error: (error) => {
        console.error('Auto resend code error:', error);
        // Don't show error for auto-resend, user can manually resend if needed
      }
    });
  }

  /**
   * Clear error message when user starts typing
   */
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (!this.username || !this.confirmationCode) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyEmail(this.username.trim(), this.confirmationCode.trim()).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          this.successMessage = 'Email verified successfully! You can now sign in.';
          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Email verification error:', error);
        
        // Handle specific AWS Cognito errors
        if (error.name === 'CodeMismatchException') {
          this.errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (error.name === 'ExpiredCodeException') {
          this.errorMessage = 'Verification code has expired. Please request a new one.';
        } else if (error.name === 'UserNotFoundException') {
          this.errorMessage = 'User not found. Please check your username.';
        } else if (error.name === 'NotAuthorizedException') {
          this.errorMessage = 'User is already verified! You can now sign in with your credentials.';
          // Show success message instead of error since user is actually verified
          setTimeout(() => {
            this.successMessage = 'Your email is already verified. Redirecting to login...';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }, 1000);
        } else if (error.name === 'LimitExceededException') {
          this.errorMessage = 'Too many attempts. Please try again later.';
        } else {
          this.errorMessage = error.message || 'Email verification failed. Please try again.';
        }
      }
    });
  }

  /**
   * Resend confirmation code
   */
  resendCode(): void {
    if (!this.username) {
      this.errorMessage = 'Please enter your username to resend the code.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resendConfirmationCode(this.username.trim()).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          this.successMessage = 'A new verification code has been sent to your email.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Resend code error:', error);
        
        // Handle specific AWS Cognito errors
        if (error.name === 'UserNotFoundException') {
          this.errorMessage = 'User not found. Please check your username.';
        } else if (error.name === 'InvalidParameterException') {
          this.errorMessage = 'User is already verified! You can sign in directly.';
          // Show success message and redirect
          setTimeout(() => {
            this.successMessage = 'Your email is already verified. Redirecting to login...';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }, 1000);
        } else if (error.name === 'LimitExceededException') {
          this.errorMessage = 'Too many attempts. Please try again later.';
        } else {
          this.errorMessage = error.message || 'Failed to resend code. Please try again.';
        }
      }
    });
  }

  /**
   * Navigate back to login
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Try to login directly if user is already verified
   */
  tryDirectLogin(): void {
    this.successMessage = 'Your email is already verified. You can now sign in!';
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1500);
  }
}
