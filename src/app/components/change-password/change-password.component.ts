import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if we have an active challenge
    this.authService.challenge$.subscribe(challenge => {
      if (challenge !== 'NEW_PASSWORD_REQUIRED') {
        // No active challenge, redirect to login
        this.router.navigate(['/login']);
      }
    });
  }

  onSubmit() {
    this.error = '';
    
    if (!this.newPassword || !this.confirmPassword) {
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

    this.authService.respondToNewPasswordChallenge(this.newPassword).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          console.log('Password changed successfully');
          // Redirect to home page after successful password change
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        } else {
          this.error = 'Failed to change password. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Change password error:', error);
        this.error = error.message || 'An error occurred while changing password';
      }
    });
  }
}
