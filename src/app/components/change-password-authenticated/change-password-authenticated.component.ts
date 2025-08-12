import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password-authenticated',
  templateUrl: './change-password-authenticated.component.html',
  styleUrls: ['./change-password-authenticated.component.css']
})
export class ChangePasswordAuthenticatedComponent implements OnInit {
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  error: string = '';
  success: boolean = false;

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

  onSubmit(): void {
    this.error = '';
    this.success = false;
    
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.error = 'Please fill in all fields';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'New passwords do not match';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.error = 'New password must be different from current password';
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(this.newPassword)) {
      this.error = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
      return;
    }

    this.isLoading = true;

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (result) => {
        this.isLoading = false;
        if (result) {
          this.success = true;
          // Clear form
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          
          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            this.success = false;
          }, 3000);
        } else {
          this.error = 'Failed to change password. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Change password error:', error);
        
        // Handle specific AWS Cognito errors
        switch (error.name) {
          case 'NotAuthorizedException':
            this.error = 'Current password is incorrect.';
            break;
          case 'InvalidPasswordException':
            this.error = 'New password does not meet requirements.';
            break;
          case 'LimitExceededException':
            this.error = 'Too many requests. Please try again later.';
            break;
          case 'InvalidParameterException':
            this.error = 'Invalid request. Please check your input.';
            break;
          default:
            this.error = error.message || 'An error occurred while changing password';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
