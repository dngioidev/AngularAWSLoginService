import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface TokenInfo {
  type: string;
  value: string | null;
  decoded?: any;
  isExpired?: boolean;
  expiresAt?: Date | null;
  timeUntilExpiry?: string;
}

@Component({
  selector: 'app-token-refresh-demo',
  templateUrl: './token-refresh-demo.component.html',
  styleUrl: './token-refresh-demo.component.css'
})
export class TokenRefreshDemoComponent implements OnInit, OnDestroy {
  currentTokens: TokenInfo[] = [];
  refreshResult: any = null;
  isLoading = false;
  error: string = '';
  
  // Auto-refresh timer
  autoRefreshEnabled = false;
  autoRefreshCountdown = 0;
  private autoRefreshTimer: any = null;
  private countdownTimer: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCurrentTokens();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadCurrentTokens(): void {
    const accessToken = localStorage.getItem('accessToken');
    const idToken = localStorage.getItem('idToken');
    const refreshToken = localStorage.getItem('refreshToken');

    this.currentTokens = [
      {
        type: 'Access Token',
        value: accessToken,
        decoded: this.decodeJWT(accessToken),
        isExpired: this.isTokenExpired(accessToken),
        expiresAt: this.getTokenExpiration(accessToken),
        timeUntilExpiry: this.getTimeUntilExpiry(accessToken)
      },
      {
        type: 'ID Token',
        value: idToken,
        decoded: this.decodeJWT(idToken),
        isExpired: this.isTokenExpired(idToken),
        expiresAt: this.getTokenExpiration(idToken),
        timeUntilExpiry: this.getTimeUntilExpiry(idToken)
      },
      {
        type: 'Refresh Token',
        value: refreshToken,
        decoded: null, // Refresh tokens are opaque
        isExpired: false, // Refresh tokens don't have standard expiry
        expiresAt: null,
        timeUntilExpiry: 'N/A (Long-lived)'
      }
    ];
  }

  async performRefresh(): Promise<void> {
    this.isLoading = true;
    this.error = '';

    try {
      const result = await this.authService.manualRefreshTokens();
      this.refreshResult = result;
      
      if (result.success) {
        // Reload current tokens to show the updated ones
        setTimeout(() => {
          this.loadCurrentTokens();
        }, 100);
      } else {
        this.error = result.error || 'Token refresh failed';
      }
    } catch (error: any) {
      this.error = error.message || 'Failed to refresh tokens';
    } finally {
      this.isLoading = false;
    }
  }

  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
  }

  startAutoRefresh(): void {
    this.autoRefreshEnabled = true;
    this.autoRefreshCountdown = 30; // 30 seconds countdown

    this.countdownTimer = setInterval(() => {
      this.autoRefreshCountdown--;
      
      if (this.autoRefreshCountdown <= 0) {
        this.performRefresh();
        this.autoRefreshCountdown = 30; // Reset countdown
      }
    }, 1000);
  }

  stopAutoRefresh(): void {
    this.autoRefreshEnabled = false;
    this.autoRefreshCountdown = 0;
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private decodeJWT(token: string | null): any {
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded;
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    const decoded = this.decodeJWT(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }

  private getTokenExpiration(token: string | null): Date | null {
    if (!token) return null;

    const decoded = this.decodeJWT(token);
    if (!decoded || !decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  }

  private getTimeUntilExpiry(token: string | null): string {
    if (!token) return 'N/A';

    const decoded = this.decodeJWT(token);
    if (!decoded || !decoded.exp) return 'N/A';

    const now = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = decoded.exp - now;

    if (secondsUntilExpiry <= 0) return 'Expired';

    const minutes = Math.floor(secondsUntilExpiry / 60);
    const seconds = secondsUntilExpiry % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  }

  copyTokenPayload(token: TokenInfo): void {
    if (token.decoded) {
      const formatted = JSON.stringify(token.decoded, null, 2);
      this.copyToClipboard(formatted);
    }
  }

  formatJSON(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  getTokenStatus(token: TokenInfo): string {
    if (!token.value) return 'Missing';
    if (token.isExpired) return 'Expired';
    if (token.timeUntilExpiry && token.timeUntilExpiry !== 'N/A') {
      const time = token.timeUntilExpiry;
      if (time.includes('m')) {
        const minutes = parseInt(time.split('m')[0]);
        if (minutes < 5) return 'Expiring Soon';
      }
    }
    return 'Valid';
  }

  getTokenStatusClass(token: TokenInfo): string {
    const status = this.getTokenStatus(token);
    switch (status) {
      case 'Valid': return 'status-valid';
      case 'Expiring Soon': return 'status-warning';
      case 'Expired': return 'status-expired';
      case 'Missing': return 'status-missing';
      default: return '';
    }
  }

  clearResults(): void {
    this.refreshResult = null;
    this.error = '';
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
