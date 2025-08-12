import { Component, OnInit } from '@angular/core';
import { Amplify } from 'aws-amplify';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Angular AWS Amplify Authentication Demo';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Configure AWS Amplify
    try {
      Amplify.configure(environment.amplify);
      console.log('Amplify configured successfully');
      
      // Check for OAuth redirect
      this.handleOAuthRedirect();
      
    } catch (error) {
      console.error('Error configuring Amplify:', error);
    }
  }

  private async handleOAuthRedirect(): Promise<void> {
    // Check if this is a redirect from OAuth provider
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code) {
      console.log('OAuth redirect detected, checking authentication state');
      try {
        // Wait a moment for Amplify to process the OAuth callback
        setTimeout(async () => {
          const isAuthenticated = await this.authService.refreshAuthState();
          if (isAuthenticated) {
            console.log('OAuth login successful, redirecting to home');
            this.router.navigate(['/home']);
          } else {
            console.log('OAuth login failed, staying on login page');
            this.router.navigate(['/login']);
          }
        }, 1000);
      } catch (error) {
        console.error('Error handling OAuth redirect:', error);
        this.router.navigate(['/login']);
      }
    }
  }
}
