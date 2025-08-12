import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  user: User | null = null;
  isLoggingOut = false;
  isGlobalLoggingOut = false;
  isEndpointLoggingOut = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to user changes
    this.subscription.add(
      this.authService.getUser().subscribe(user => {
        this.user = user;
      })
    );

    // Check authentication status
    this.subscription.add(
      this.authService.isAuthenticated$.subscribe(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Handle user logout
   */
  onLogout(): void {
    this.isLoggingOut = true;

    this.authService.signOut().subscribe({
      next: () => {
        this.isLoggingOut = false;
        // Navigation is handled in the service
      },
      error: (error) => {
        this.isLoggingOut = false;
        console.error('Logout error:', error);
        // Still navigate to login on error
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Handle global logout (all devices)
   */
  onGlobalLogout(): void {
    this.isGlobalLoggingOut = true;

    this.authService.globalSignOut().subscribe({
      next: () => {
        this.isGlobalLoggingOut = false;
        // Navigation is handled in the service
      },
      error: (error) => {
        this.isGlobalLoggingOut = false;
        console.error('Global logout error:', error);
        // Still navigate to login on error
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Handle endpoint logout (revoke refresh token)
   */
  onEndpointLogout(): void {
    this.isEndpointLoggingOut = true;

    this.authService.signOutWithEndpoint().subscribe({
      next: () => {
        this.isEndpointLoggingOut = false;
        // Navigation is handled in the service
      },
      error: (error) => {
        this.isEndpointLoggingOut = false;
        console.error('Endpoint logout error:', error);
        // Still navigate to login on error
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Get display name for the user
   */
  getDisplayName(): string {
    if (this.user?.email) {
      return this.user.email;
    }
    if (this.user?.username) {
      return this.user.username;
    }
    return 'User';
  }
}
