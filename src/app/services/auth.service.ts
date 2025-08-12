import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { signOut, getCurrentUser, fetchAuthSession, AuthError } from 'aws-amplify/auth';
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand, 
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
  GlobalSignOutCommand,
  RevokeTokenCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommandInput
} from '@aws-sdk/client-cognito-identity-provider';
import { environment } from '../../environments/environment';

export interface User {
  username: string;
  email?: string;
  attributes?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private challengeSubject = new BehaviorSubject<string | null>(null);
  public challenge$ = this.challengeSubject.asObservable();
  
  private cognitoClient: CognitoIdentityProviderClient;
  private currentSession: any = null;
  private tokenCheckInterval: any = null;

  constructor(private router: Router) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: environment.amplify.Auth.Cognito.region
    });
    this.checkAuthState();
    this.startTokenValidationTimer();
  }

  /**
   * Start periodic token validation timer
   */
  private startTokenValidationTimer(): void {
    // Check tokens every 10 minutes (reduced frequency for better performance)
    this.tokenCheckInterval = setInterval(() => {
      // Only check if user is currently authenticated
      if (this.isAuthenticatedSubject.value) {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && this.isTokenExpired(accessToken)) {
          console.log('Periodic check: Access token expired, triggering refresh...');
          this.checkAuthState();
        }
      }
    }, 10 * 60 * 1000); // 10 minutes (was 5)
  }

  /**
   * Stop the token validation timer
   */
  private stopTokenValidationTimer(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  /**
   * Calculate secret hash for Cognito authentication
   * Required when the app client has a client secret
   */
  private async calculateSecretHash(username: string): Promise<string> {
    const message = username + environment.cognito.clientId;
    const key = environment.cognito.clientSecret;

    // Use Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    
    // Convert to base64
    const hashArray = Array.from(new Uint8Array(signature));
    return btoa(String.fromCharCode(...hashArray));
  }

  /**
   * Check the current authentication state
   */
  private async checkAuthState(): Promise<void> {
    try {
      // First check if we have tokens in localStorage (from our custom auth)
      const accessToken = localStorage.getItem('accessToken');
      const idToken = localStorage.getItem('idToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken) {
        // Only check token expiration if we're already authenticated
        // Don't interfere with initial login process
        if (this.isAuthenticatedSubject.value && this.isTokenExpired(accessToken)) {
          console.log('Access token expired, attempting refresh...');
          
          if (refreshToken) {
            const refreshSuccess = await this.refreshTokens();
            if (refreshSuccess) {
              console.log('Token refresh successful');
              return; // checkAuthState will be called again after refresh
            } else {
              console.log('Token refresh failed, clearing session');
              this.clearTokens();
              this.userSubject.next(null);
              this.isAuthenticatedSubject.next(false);
              return;
            }
          } else {
            console.log('No refresh token available, clearing session');
            this.clearTokens();
            this.userSubject.next(null);
            this.isAuthenticatedSubject.next(false);
            return;
          }
        }
        
        // Parse the ID token to get user information
        if (idToken) {
          try {
            const payload = this.parseJwtPayload(idToken);
            this.userSubject.next({
              username: payload['cognito:username'] || payload.sub,
              email: payload.email,
              attributes: payload
            });
            this.isAuthenticatedSubject.next(true);
            console.log('User authenticated via custom token storage');
            return;
          } catch (parseError) {
            console.error('Error parsing ID token:', parseError);
          }
        }
        
        // If we have access token but can't parse ID token, still consider authenticated
        this.userSubject.next({
          username: 'User',
          email: undefined,
          attributes: null
        });
        this.isAuthenticatedSubject.next(true);
        console.log('User authenticated via access token');
        return;
      }
      
      // Fallback to Amplify's method (for other auth flows)
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (user && session.tokens) {
        this.userSubject.next({
          username: user.username,
          email: user.signInDetails?.loginId,
          attributes: user
        });
        this.isAuthenticatedSubject.next(true);
        console.log('User authenticated via Amplify');
      } else {
        this.userSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        console.log('No authenticated user found');
      }
    } catch (error) {
      console.log('No authenticated user found:', error);
      this.userSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    }
  }

  /**
   * Parse JWT payload without verification (for client-side display only)
   */
  private parseJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return {};
    }
  }

  /**
   * Check if a JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.parseJwtPayload(token);
      if (!payload.exp) {
        return true; // If no exp claim, consider expired
      }
      
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      const expirationTime = payload.exp;
      
      // Add a 5-minute buffer before expiration
      const bufferTime = 5 * 60; // 5 minutes in seconds
      return currentTime >= (expirationTime - bufferTime);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // If error parsing, consider expired
    }
  }

  /**
   * Clear all stored tokens
   */
  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    console.log('All tokens cleared from localStorage');
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshTokens(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      // Get the username for SECRET_HASH calculation
      const idToken = localStorage.getItem('idToken');
      let username = '';
      
      if (idToken) {
        try {
          const payload = this.parseJwtPayload(idToken);
          username = payload['cognito:username'] || payload.sub || '';
        } catch (error) {
          console.error('Error extracting username from ID token:', error);
          return false;
        }
      }

      if (!username) {
        console.log('No username available for token refresh');
        return false;
      }

      const secretHash = await this.calculateSecretHash(username);

      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: environment.cognito.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          SECRET_HASH: secretHash
        }
      });

      const response = await this.cognitoClient.send(command);

      if (response.AuthenticationResult?.AccessToken) {
        // Store new tokens
        localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
        
        if (response.AuthenticationResult.IdToken) {
          localStorage.setItem('idToken', response.AuthenticationResult.IdToken);
        }

        // New refresh token might be provided
        if (response.AuthenticationResult.RefreshToken) {
          localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken);
        }

        console.log('Tokens refreshed successfully');
        
        // Update authentication state directly without calling checkAuthState to avoid recursion
        if (response.AuthenticationResult.IdToken) {
          try {
            const payload = this.parseJwtPayload(response.AuthenticationResult.IdToken);
            this.userSubject.next({
              username: payload['cognito:username'] || payload.sub,
              email: payload.email,
              attributes: payload
            });
            this.isAuthenticatedSubject.next(true);
          } catch (parseError) {
            console.error('Error parsing refreshed ID token:', parseError);
            this.userSubject.next({
              username: 'User',
              email: undefined,
              attributes: null
            });
            this.isAuthenticatedSubject.next(true);
          }
        } else {
          this.userSubject.next({
            username: 'User',
            email: undefined,
            attributes: null
          });
          this.isAuthenticatedSubject.next(true);
        }
        
        return true;
      }

      console.log('Token refresh failed - no access token in response');
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, the refresh token might be expired
      // Clear all tokens and redirect to login
      this.clearTokens();
      this.userSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.router.navigate(['/login']);
      return false;
    }
  }

  /**
   * Force refresh the authentication state
   */
  public async refreshAuthState(): Promise<boolean> {
    await this.checkAuthState();
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Validate the current session and refresh tokens if needed
   * Used by AuthGuard to ensure valid authentication before accessing protected routes
   */
  public async validateCurrentSession(): Promise<boolean> {
    return this.refreshAuthState();
  }

  /**
   * Manual refresh token flow that returns both old and new tokens for debugging
   */
  public async manualRefreshTokens(): Promise<{
    success: boolean;
    oldTokens: {
      accessToken: string | null;
      idToken: string | null;
      refreshToken: string | null;
    };
    newTokens: {
      accessToken: string | null;
      idToken: string | null;
      refreshToken: string | null;
    };
    error?: string;
  }> {
    try {
      // Store old tokens
      const oldTokens = {
        accessToken: localStorage.getItem('accessToken'),
        idToken: localStorage.getItem('idToken'),
        refreshToken: localStorage.getItem('refreshToken')
      };

      // Attempt refresh
      const refreshSuccess = await this.refreshTokens();
      
      if (refreshSuccess) {
        // Get new tokens
        const newTokens = {
          accessToken: localStorage.getItem('accessToken'),
          idToken: localStorage.getItem('idToken'),
          refreshToken: localStorage.getItem('refreshToken')
        };

        return {
          success: true,
          oldTokens,
          newTokens
        };
      } else {
        return {
          success: false,
          oldTokens,
          newTokens: { accessToken: null, idToken: null, refreshToken: null },
          error: 'Token refresh failed'
        };
      }
    } catch (error: any) {
      const oldTokens = {
        accessToken: localStorage.getItem('accessToken'),
        idToken: localStorage.getItem('idToken'),
        refreshToken: localStorage.getItem('refreshToken')
      };

      return {
        success: false,
        oldTokens,
        newTokens: { accessToken: null, idToken: null, refreshToken: null },
        error: error.message || 'Unknown error during token refresh'
      };
    }
  }

  /**
   * Test basic authentication without token validation
   * Used for debugging login issues
   */
  public async testBasicAuth(username: string, password: string): Promise<any> {
    try {
      console.log('Testing basic auth for:', username);
      const secretHash = await this.calculateSecretHash(username);
      
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: environment.cognito.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: secretHash
        }
      });

      const response = await this.cognitoClient.send(command);
      console.log('Test auth response:', response);
      return response;
    } catch (error) {
      console.error('Test auth error:', error);
      throw error;
    }
  }

  /**
   * Sign in with username and password
   * @param username - User's username or email
   * @param password - User's password
   * @returns Observable<boolean> - Success status
   */
  signIn(username: string, password: string): Observable<boolean> {
    console.log(`Attempting to sign in user: ${username}`);
    
    return from(
      this.calculateSecretHash(username).then(async (secretHash) => {
        try {
          console.log('Secret hash calculated, sending InitiateAuthCommand...');
          
          const command = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: environment.cognito.clientId,
            AuthParameters: {
              USERNAME: username,
              PASSWORD: password,
              SECRET_HASH: secretHash
            }
          });

          const response = await this.cognitoClient.send(command);
          console.log('InitiateAuthCommand response:', response);
          
          // Check if this is a challenge response
          if (response.ChallengeName) {
            console.log(`Challenge detected: ${response.ChallengeName}`);
            this.currentSession = response.Session;
            this.challengeSubject.next(response.ChallengeName);
            
            if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
              // Store username for the challenge response
              localStorage.setItem('challengeUsername', username);
              return false; // Don't authenticate yet, need new password
            }
            
            return false;
          }
          
          if (response.AuthenticationResult?.AccessToken) {
            console.log('Authentication successful, storing tokens...');
            
            // Store tokens in local storage (or session storage)
            localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
            if (response.AuthenticationResult.IdToken) {
              localStorage.setItem('idToken', response.AuthenticationResult.IdToken);
            }
            if (response.AuthenticationResult.RefreshToken) {
              localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken);
            }
            
            console.log('Tokens stored, updating authentication state...');
            await this.checkAuthState();
            console.log('Authentication state updated, user authenticated:', this.isAuthenticatedSubject.value);
            this.challengeSubject.next(null); // Clear any challenge
            return true;
          }
          
          console.warn('No authentication result in response');
          return false;
        } catch (error) {
          console.error('Direct Cognito sign-in error:', error);
          throw error;
        }
      })
    ).pipe(
      catchError((error: any) => {
        console.error('Sign in error:', error);
        throw error;
      })
    );
  }

  /**
   * Respond to NEW_PASSWORD_REQUIRED challenge
   * @param newPassword - The new password to set
   * @returns Observable<boolean> - Success status
   */
  respondToNewPasswordChallenge(newPassword: string): Observable<boolean> {
    return from(
      (async () => {
        try {
          const username = localStorage.getItem('challengeUsername');
          if (!username || !this.currentSession) {
            throw new Error('No active password challenge session');
          }

          const secretHash = await this.calculateSecretHash(username);
          
          const command = new RespondToAuthChallengeCommand({
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            ClientId: environment.cognito.clientId,
            Session: this.currentSession,
            ChallengeResponses: {
              USERNAME: username,
              NEW_PASSWORD: newPassword,
              SECRET_HASH: secretHash
            }
          });

          const response = await this.cognitoClient.send(command);
          
          if (response.AuthenticationResult?.AccessToken) {
            // Store tokens in local storage
            localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
            if (response.AuthenticationResult.IdToken) {
              localStorage.setItem('idToken', response.AuthenticationResult.IdToken);
            }
            if (response.AuthenticationResult.RefreshToken) {
              localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken);
            }
            
            // Clean up challenge state
            localStorage.removeItem('challengeUsername');
            this.currentSession = null;
            this.challengeSubject.next(null);
            
            console.log('Password challenge completed, tokens stored');
            await this.checkAuthState();
            console.log('Authentication state updated, user authenticated:', this.isAuthenticatedSubject.value);
            return true;
          }
          return false;
        } catch (error) {
          console.error('Password challenge error:', error);
          throw error;
        }
      })()
    ).pipe(
      catchError((error: any) => {
        console.error('New password challenge error:', error);
        throw error;
      })
    );
  }

  /**
   * Federated sign in with Microsoft Azure AD
   * @returns Observable<void>
   */
  federatedSignIn(): Observable<void> {
    // Note: For federated sign-in, you'll need to configure OAuth in your Amplify setup
    // This is a placeholder implementation - in practice, you would redirect to the OAuth provider
    return new Observable<void>((observer) => {
      try {
        // Redirect to Microsoft OAuth
        window.location.href = `https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/authorize?identity_provider=AzureAD&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=CODE&client_id=your-client-id&scope=openid email profile`;
        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Sign out the current user
   * @returns Observable<void>
   */
  signOut(): Observable<void> {
    return new Observable<void>((observer) => {
      try {
        // Stop token validation timer
        this.stopTokenValidationTimer();
        
        // Clear our custom tokens from localStorage
        this.clearTokens();
        localStorage.removeItem('challengeUsername');
        
        // Clear challenge state
        this.challengeSubject.next(null);
        this.currentSession = null;
        
        // Try to sign out from Amplify as well (for other auth flows)
        signOut().then(() => {
          this.userSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          this.router.navigate(['/login']);
          observer.next();
          observer.complete();
        }).catch((error) => {
          // Even if Amplify signOut fails, we've cleared our tokens
          console.log('Amplify signOut failed, but custom tokens cleared:', error);
          this.userSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          this.router.navigate(['/login']);
          observer.next();
          observer.complete();
        });
      } catch (error) {
        // Clear tokens and navigate even if there's an error
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        this.userSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.router.navigate(['/login']);
        observer.error(error);
      }
    });
  }

  /**
   * Get the current user
   * @returns User | null
   */
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Check if user is authenticated
   * @returns boolean
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Check if there's an active challenge
   * @returns string | null - Current challenge name
   */
  getCurrentChallenge(): string | null {
    return this.challengeSubject.value;
  }

  /**
   * Get user observable
   * @returns Observable<User | null>
   */
  getUser(): Observable<User | null> {
    return this.user$;
  }

  /**
   * Forgot password - initiate password reset
   * @param username - User's username or email
   * @returns Observable<boolean> - Success status
   */
  forgotPassword(username: string): Observable<boolean> {
    return from(
      this.calculateSecretHash(username).then(async (secretHash) => {
        try {
          const command = new ForgotPasswordCommand({
            ClientId: environment.cognito.clientId,
            Username: username,
            SecretHash: secretHash
          });

          await this.cognitoClient.send(command);
          return true;
        } catch (error) {
          console.error('Forgot password error:', error);
          throw error;
        }
      })
    ).pipe(
      catchError((error: any) => {
        console.error('Forgot password error:', error);
        throw error;
      })
    );
  }

  /**
   * Confirm forgot password - complete password reset with verification code
   * @param username - User's username or email
   * @param confirmationCode - Verification code from email/SMS
   * @param newPassword - New password
   * @returns Observable<boolean> - Success status
   */
  confirmForgotPassword(username: string, confirmationCode: string, newPassword: string): Observable<boolean> {
    return from(
      this.calculateSecretHash(username).then(async (secretHash) => {
        try {
          const command = new ConfirmForgotPasswordCommand({
            ClientId: environment.cognito.clientId,
            Username: username,
            ConfirmationCode: confirmationCode,
            Password: newPassword,
            SecretHash: secretHash
          });

          await this.cognitoClient.send(command);
          return true;
        } catch (error) {
          console.error('Confirm forgot password error:', error);
          throw error;
        }
      })
    ).pipe(
      catchError((error: any) => {
        console.error('Confirm forgot password error:', error);
        throw error;
      })
    );
  }

  /**
   * Verify email address with confirmation code
   * @param username - User's username or email
   * @param confirmationCode - Verification code from email
   * @returns Observable<boolean> - Success status
   */
  verifyEmail(username: string, confirmationCode: string): Observable<boolean> {
    return from(
      this.calculateSecretHash(username).then(async (secretHash) => {
        try {
          const command = new ConfirmSignUpCommand({
            ClientId: environment.cognito.clientId,
            Username: username,
            ConfirmationCode: confirmationCode,
            SecretHash: secretHash
          });

          await this.cognitoClient.send(command);
          return true;
        } catch (error) {
          console.error('Verify email error:', error);
          throw error;
        }
      })
    ).pipe(
      catchError((error: any) => {
        console.error('Verify email error:', error);
        throw error;
      })
    );
  }

  /**
   * Resend confirmation code for email verification
   * @param username - User's username or email
   * @returns Observable<boolean> - Success status
   */
  resendConfirmationCode(username: string): Observable<boolean> {
    return from(
      this.calculateSecretHash(username).then(async (secretHash) => {
        try {
          const command = new ResendConfirmationCodeCommand({
            ClientId: environment.cognito.clientId,
            Username: username,
            SecretHash: secretHash
          });

          await this.cognitoClient.send(command);
          return true;
        } catch (error) {
          console.error('Resend confirmation code error:', error);
          throw error;
        }
      })
    ).pipe(
      catchError((error: any) => {
        console.error('Resend confirmation code error:', error);
        throw error;
      })
    );
  }

  /**
   * Change password for authenticated user
   * @param previousPassword - Current password
   * @param proposedPassword - New password
   * @returns Observable<boolean> - Success status
   */
  changePassword(previousPassword: string, proposedPassword: string): Observable<boolean> {
    return from(
      (async () => {
        try {
          const accessToken = localStorage.getItem('accessToken');
          if (!accessToken) {
            throw new Error('No access token found. User must be authenticated.');
          }

          const command = new ChangePasswordCommand({
            AccessToken: accessToken,
            PreviousPassword: previousPassword,
            ProposedPassword: proposedPassword
          });

          await this.cognitoClient.send(command);
          return true;
        } catch (error) {
          console.error('Change password error:', error);
          throw error;
        }
      })()
    ).pipe(
      catchError((error: any) => {
        console.error('Change password error:', error);
        throw error;
      })
    );
  }

  /**
   * Global sign out - sign out from all devices
   * @returns Observable<boolean> - Success status
   */
  globalSignOut(): Observable<boolean> {
    return from(
      (async () => {
        try {
          const accessToken = localStorage.getItem('accessToken');
          if (!accessToken) {
            throw new Error('No access token found. User must be authenticated.');
          }

          const command = new GlobalSignOutCommand({
            AccessToken: accessToken
          });

          await this.cognitoClient.send(command);
          
          // Clear local tokens and state
          this.clearTokens();
          localStorage.removeItem('challengeUsername');
          
          // Clear challenge state
          this.challengeSubject.next(null);
          this.currentSession = null;
          
          // Stop token validation timer
          this.stopTokenValidationTimer();
          
          // Update authentication state
          this.userSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          this.router.navigate(['/login']);
          
          return true;
        } catch (error) {
          console.error('Global sign out error:', error);
          throw error;
        }
      })()
    ).pipe(
      catchError((error: any) => {
        console.error('Global sign out error:', error);
        throw error;
      })
    );
  }

  /**
   * Sign out with logout endpoint - revoke refresh token
   * @returns Observable<boolean> - Success status
   */
  signOutWithEndpoint(): Observable<boolean> {
    return from(
      (async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token found. User must be authenticated.');
          }

          const command = new RevokeTokenCommand({
            Token: refreshToken,
            ClientId: environment.amplify.Auth.Cognito.userPoolClientId
          });

          await this.cognitoClient.send(command);
          
          // Clear local tokens and state
          this.clearTokens();
          localStorage.removeItem('challengeUsername');
          
          // Clear challenge state
          this.challengeSubject.next(null);
          this.currentSession = null;
          
          // Stop token validation timer
          this.stopTokenValidationTimer();
          
          // Update authentication state
          this.userSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          this.router.navigate(['/login']);
          
          return true;
        } catch (error) {
          console.error('Endpoint sign out error:', error);
          throw error;
        }
      })()
    ).pipe(
      catchError((error: any) => {
        console.error('Endpoint sign out error:', error);
        throw error;
      })
    );
  }

  /**
   * Get Identity ID from Cognito Identity Pool
   * @returns Observable<string> - Identity ID
   */
  getIdentityId(): Observable<string> {
    return from(
      (async () => {
        try {
          const idToken = localStorage.getItem('idToken');
          if (!idToken) {
            throw new Error('No ID token found. User must be authenticated.');
          }

          // Use AWS SDK to get identity ID
          const { fromCognitoIdentityPool } = await import('@aws-sdk/credential-providers');
          const credentials = fromCognitoIdentityPool({
            clientConfig: { region: environment.amplify.Auth.Cognito.region },
            identityPoolId: environment.amplify.Auth.Cognito.identityPoolId,
            logins: {
              [`cognito-idp.${environment.amplify.Auth.Cognito.region}.amazonaws.com/${environment.amplify.Auth.Cognito.userPoolId}`]: idToken
            }
          });

          const resolvedCredentials = await credentials();
          return resolvedCredentials.identityId || '';
        } catch (error) {
          console.error('Get identity ID error:', error);
          throw error;
        }
      })()
    ).pipe(
      catchError((error: any) => {
        console.error('Get identity ID error:', error);
        throw error;
      })
    );
  }

  /**
   * Get AWS credentials for S3 operations (Promise-based)
   * @returns Promise<any> - AWS credentials
   */
  async getAWSCredentials(): Promise<any> {
    try {
      const idToken = localStorage.getItem('idToken');
      if (!idToken) {
        throw new Error('No ID token found. User must be authenticated.');
      }

      // Use AWS SDK to get temporary credentials
      const { fromCognitoIdentityPool } = await import('@aws-sdk/credential-providers');
      const credentials = fromCognitoIdentityPool({
        clientConfig: { region: environment.amplify.Auth.Cognito.region },
        identityPoolId: environment.amplify.Auth.Cognito.identityPoolId,
        logins: {
          [`cognito-idp.${environment.amplify.Auth.Cognito.region}.amazonaws.com/${environment.amplify.Auth.Cognito.userPoolId}`]: idToken
        }
      });

      const resolvedCredentials = await credentials();
      return {
        AccessKeyId: resolvedCredentials.accessKeyId,
        SecretKey: resolvedCredentials.secretAccessKey,
        SessionToken: resolvedCredentials.sessionToken,
        IdentityId: resolvedCredentials.identityId,
        Expiration: resolvedCredentials.expiration
      };
    } catch (error) {
      console.error('Get AWS credentials error:', error);
      throw error;
    }
  }

  /**
   * Get implicit token (temporary AWS credentials) from identity pool
   * @returns Observable<any> - AWS credentials
   */
  getImplicitToken(): Observable<any> {
    return from(
      (async () => {
        try {
          const idToken = localStorage.getItem('idToken');
          if (!idToken) {
            throw new Error('No ID token found. User must be authenticated.');
          }

          // Use AWS SDK to get temporary credentials
          const { fromCognitoIdentityPool } = await import('@aws-sdk/credential-providers');
          const credentials = fromCognitoIdentityPool({
            clientConfig: { region: environment.amplify.Auth.Cognito.region },
            identityPoolId: environment.amplify.Auth.Cognito.identityPoolId,
            logins: {
              [`cognito-idp.${environment.amplify.Auth.Cognito.region}.amazonaws.com/${environment.amplify.Auth.Cognito.userPoolId}`]: idToken
            }
          });

          const resolvedCredentials = await credentials();
          return {
            accessKeyId: resolvedCredentials.accessKeyId,
            secretAccessKey: resolvedCredentials.secretAccessKey,
            sessionToken: resolvedCredentials.sessionToken,
            identityId: resolvedCredentials.identityId,
            expiration: resolvedCredentials.expiration
          };
        } catch (error) {
          console.error('Get implicit token error:', error);
          throw error;
        }
      })()
    ).pipe(
      catchError((error: any) => {
        console.error('Get implicit token error:', error);
        throw error;
      })
    );
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    this.stopTokenValidationTimer();
  }
}
