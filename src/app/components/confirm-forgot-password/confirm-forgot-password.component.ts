import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-forgot-password',
  templateUrl: './confirm-forgot-password.component.html',
  styleUrls: ['./confirm-forgot-password.component.css']
})
export class ConfirmForgotPasswordComponent implements OnInit {
  username: string = '';
  confirmationCode: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  error: string = '';
  success: boolean = false;

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
      }
    });
  }

  onSubmit(): void {
    this.error = '';
    
    if (!this.username || !this.confirmationCode || !this.newPassword || !this.confirmPassword) {
      this.error = 'Please fill in all fields';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(this.newPassword)) {
      this.error = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
      return;
    }

    this.isLoading = true;

    this.authService.confirmForgotPassword(this.username, this.confirmationCode, this.newPassword).subscribe({
      next: (result) => {
        this.isLoading = false;
        if (result) {
          this.success = true;
          // Redirect to login page after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.error = 'Failed to reset password. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Confirm forgot password error:', error);
        
        // Handle specific AWS Cognito errors
        switch (error.name) {
          case 'CodeMismatchException':
            this.error = 'Invalid verification code. Please check and try again.';
            break;
          case 'ExpiredCodeException':
            this.error = 'Verification code has expired. Please request a new one.';
            break;
          case 'InvalidPasswordException':
            this.error = 'Password does not meet requirements. Please check the password policy.';
            break;
          case 'UserNotFoundException':
            this.error = 'User not found. Please check your username.';
            break;
          case 'TooManyFailedAttemptsException':
            this.error = 'Too many failed attempts. Please try again later.';
            break;
          default:
            this.error = error.message || 'An error occurred while resetting password';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/forgot-password']);
  }

  resendCode(): void {
    if (!this.username) {
      this.error = 'Please enter your username first';
      return;
    }

    this.authService.forgotPassword(this.username).subscribe({
      next: (result) => {
        if (result) {
          this.error = '';
          // Show success message temporarily
          const originalError = this.error;
          this.error = 'New verification code sent to your email/phone';
          setTimeout(() => {
            this.error = originalError;
          }, 3000);
        }
      },
      error: (error) => {
        this.error = 'Failed to resend code. Please try again.';
      }
    });
  }
}
