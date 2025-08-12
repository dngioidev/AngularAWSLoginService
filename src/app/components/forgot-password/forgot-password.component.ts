import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  username: string = '';
  isLoading: boolean = false;
  error: string = '';
  success: boolean = false;
  successMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  onSubmit(): void {
    if (!this.username) {
      this.error = 'Please enter your username or email';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.success = false;

    this.authService.forgotPassword(this.username).subscribe({
      next: (result) => {
        this.isLoading = false;
        if (result) {
          this.success = true;
          this.successMessage = 'Password reset code sent to your email/phone. Check your inbox and enter the code on the next page.';
          // Redirect to confirm forgot password page after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/confirm-forgot-password'], { 
              queryParams: { username: this.username }
            });
          }, 2000);
        } else {
          this.error = 'Failed to send reset code. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Forgot password error:', error);
        
        // Handle specific AWS Cognito errors
        switch (error.name) {
          case 'UserNotFoundException':
            this.error = 'User not found. Please check your username or email.';
            break;
          case 'InvalidParameterException':
            this.error = 'Invalid request. Please check your input.';
            break;
          case 'LimitExceededException':
            this.error = 'Too many requests. Please try again later.';
            break;
          case 'NotAuthorizedException':
            this.error = 'Password reset not allowed for this user.';
            break;
          default:
            this.error = error.message || 'An error occurred. Please try again.';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
