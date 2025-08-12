# AWS Amplify Angular Frontend Integration Guide

## Quick Setup

### 1. Install Dependencies
```bash
npm install aws-amplify @aws-amplify/ui-angular
npm install @aws-sdk/client-cognito-identity-provider
npm install @aws-sdk/client-cognito-identity
npm install @aws-sdk/credential-providers
```

### 2. Environment Configuration
```typescript
// environment.ts
export const environment = {
  amplify: {
    Auth: {
      Cognito: {
        region: 'your-region',
        userPoolId: 'your-user-pool-id',
        userPoolClientId: 'your-client-id',
        identityPoolId: 'your-identity-pool-id'
      }
    }
  },
  cognito: {
    clientSecret: 'your-client-secret',
    clientId: 'your-client-id'
  }
};
```

### 3. Initialize Amplify
```typescript
// main.ts
import { Amplify } from 'aws-amplify';
import { environment } from './environments/environment';

Amplify.configure(environment.amplify);
```

## Authentication Features & Implementation

### 🔐 **Login (Username/Password)**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `InitiateAuthCommand`

```typescript
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

signIn(username: string, password: string) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: environment.cognito.clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: secretHash // Calculate using HMAC-SHA256
    }
  });
  return this.cognitoClient.send(command);
}
```

### 🔄 **Force Password Change**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `RespondToAuthChallengeCommand`

```typescript
import { RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';

respondToNewPasswordChallenge(newPassword: string) {
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
  return this.cognitoClient.send(command);
}
```

### 📧 **Forgot Password**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `ForgotPasswordCommand`

```typescript
import { ForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

forgotPassword(username: string) {
  const command = new ForgotPasswordCommand({
    ClientId: environment.cognito.clientId,
    Username: username,
    SecretHash: secretHash
  });
  return this.cognitoClient.send(command);
}
```

### ✅ **Confirm Forgot Password**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `ConfirmForgotPasswordCommand`

```typescript
import { ConfirmForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

confirmForgotPassword(username: string, code: string, newPassword: string) {
  const command = new ConfirmForgotPasswordCommand({
    ClientId: environment.cognito.clientId,
    Username: username,
    ConfirmationCode: code,
    Password: newPassword,
    SecretHash: secretHash
  });
  return this.cognitoClient.send(command);
}
```

### 📬 **Email Verification**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Functions:** `ConfirmSignUpCommand`, `ResendConfirmationCodeCommand`

```typescript
import { ConfirmSignUpCommand, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';

// Verify email
verifyEmail(username: string, code: string) {
  const command = new ConfirmSignUpCommand({
    ClientId: environment.cognito.clientId,
    Username: username,
    ConfirmationCode: code,
    SecretHash: secretHash
  });
  return this.cognitoClient.send(command);
}

// Resend verification code
resendConfirmationCode(username: string) {
  const command = new ResendConfirmationCodeCommand({
    ClientId: environment.cognito.clientId,
    Username: username,
    SecretHash: secretHash
  });
  return this.cognitoClient.send(command);
}
```

### 🔒 **Change Password (Authenticated)**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `ChangePasswordCommand`

```typescript
import { ChangePasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

changePassword(oldPassword: string, newPassword: string) {
  const command = new ChangePasswordCommand({
    AccessToken: localStorage.getItem('accessToken'),
    PreviousPassword: oldPassword,
    ProposedPassword: newPassword
  });
  return this.cognitoClient.send(command);
}
```

### 🌐 **Global Sign Out**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `GlobalSignOutCommand`

```typescript
import { GlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';

globalSignOut() {
  const command = new GlobalSignOutCommand({
    AccessToken: localStorage.getItem('accessToken')
  });
  return this.cognitoClient.send(command);
}
```

### 🆔 **Get Identity ID**
**Library:** `@aws-sdk/client-cognito-identity`
**Function:** `GetIdCommand`

```typescript
import { CognitoIdentityClient, GetIdCommand } from '@aws-sdk/client-cognito-identity';

getIdentityId() {
  const command = new GetIdCommand({
    IdentityPoolId: environment.amplify.Auth.Cognito.identityPoolId,
    Logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
    }
  });
  return this.cognitoIdentityClient.send(command);
}
```

### 🔑 **Get AWS Credentials**
**Library:** `@aws-sdk/client-cognito-identity`
**Function:** `GetCredentialsForIdentityCommand`

```typescript
import { GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';

getImplicitToken() {
  const command = new GetCredentialsForIdentityCommand({
    IdentityId: identityId,
    Logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
    }
  });
  return this.cognitoIdentityClient.send(command);
}
```

### 🔗 **Federated Sign In (OAuth)**
**Library:** `aws-amplify/auth`
**Function:** Browser redirect

```typescript
federatedSignIn() {
  const oauthUrl = `https://${cognitoDomain}/oauth2/authorize?` +
    `identity_provider=AzureAD&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=CODE&` +
    `client_id=${clientId}&` +
    `scope=openid email profile`;
  
  window.location.href = oauthUrl;
}
```

## Utility Functions

### 🔐 **SECRET_HASH Calculation**
**Library:** Web Crypto API
**Required for:** All Cognito API calls with client secret

```typescript
async calculateSecretHash(username: string): Promise<string> {
  const message = username + environment.cognito.clientId;
  const key = environment.cognito.clientSecret;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return btoa(String.fromCharCode(...hashArray));
}
```

### 🔄 **Token Refresh**
**Library:** `@aws-sdk/client-cognito-identity-provider`
**Function:** `InitiateAuthCommand` with REFRESH_TOKEN_AUTH

```typescript
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

async refreshTokens(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
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
  // Store new tokens...
}
```

### ⏰ **Token Expiration Check**
**Library:** Native JavaScript
**Required for:** Automatic token validation

```typescript
isTokenExpired(token: string): boolean {
  const payload = this.parseJwtPayload(token);
  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = 5 * 60; // 5 minutes buffer
  return currentTime >= (payload.exp - bufferTime);
}
```

### 🎫 **JWT Token Parsing**
**Library:** Native JavaScript
**Required for:** Getting user info from ID token

```typescript
parseJwtPayload(token: string): any {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}
```

## Component Structure

### Required Components
```
components/
├── login/                    # InitiateAuthCommand
├── change-password/          # RespondToAuthChallengeCommand
├── forgot-password/          # ForgotPasswordCommand
├── confirm-forgot-password/  # ConfirmForgotPasswordCommand
├── verify-email/             # ConfirmSignUpCommand, ResendConfirmationCodeCommand
├── change-password-authenticated/ # ChangePasswordCommand
└── aws-credentials/          # GetIdCommand, GetCredentialsForIdentityCommand
```

### Auth Guard
```typescript
import { getCurrentUser } from 'aws-amplify/auth';

canActivate(): Observable<boolean> {
  // Force token validation before allowing access
  return from(this.authService.validateCurrentSession()).pipe(
    switchMap(() => {
      return this.authService.isAuthenticated$.pipe(
        take(1),
        map(isAuthenticated => {
          if (isAuthenticated) {
            return true;
          } else {
            this.router.navigate(['/login']);
            return false;
          }
        })
      );
    })
  );
}
```

## Error Handling

### Common Cognito Errors
```typescript
const errorMessages = {
  'NotAuthorizedException': 'Invalid credentials',
  'UserNotConfirmedException': 'Email not verified',
  'UserNotFoundException': 'User not found',
  'CodeMismatchException': 'Invalid verification code',
  'ExpiredCodeException': 'Code expired',
  'LimitExceededException': 'Too many attempts',
  'InvalidParameterException': 'User already confirmed'
};
```

## State Management

### Authentication State
```typescript
// Using BehaviorSubject for state management
private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

private userSubject = new BehaviorSubject<User | null>(null);
public user$ = this.userSubject.asObservable();

private challengeSubject = new BehaviorSubject<string | null>(null);
public challenge$ = this.challengeSubject.asObservable();
```

### Token Management
```typescript
// Check authentication state with token validation
async checkAuthState(): Promise<void> {
  const accessToken = localStorage.getItem('accessToken');
  
  if (accessToken && this.isTokenExpired(accessToken)) {
    const refreshSuccess = await this.refreshTokens();
    if (!refreshSuccess) {
      this.clearTokens();
      this.isAuthenticatedSubject.next(false);
      return;
    }
  }
  // Set authentication state...
}

// Periodic token validation (every 5 minutes)
private startTokenValidationTimer(): void {
  setInterval(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && this.isTokenExpired(accessToken)) {
      this.checkAuthState();
    }
  }, 5 * 60 * 1000);
}
```

## Quick Reference

| Feature | Library | Primary Function |
|---------|---------|------------------|
| **Login** | `@aws-sdk/client-cognito-identity-provider` | `InitiateAuthCommand` |
| **Force Password Change** | `@aws-sdk/client-cognito-identity-provider` | `RespondToAuthChallengeCommand` |
| **Forgot Password** | `@aws-sdk/client-cognito-identity-provider` | `ForgotPasswordCommand` |
| **Confirm Reset** | `@aws-sdk/client-cognito-identity-provider` | `ConfirmForgotPasswordCommand` |
| **Email Verification** | `@aws-sdk/client-cognito-identity-provider` | `ConfirmSignUpCommand` |
| **Resend Code** | `@aws-sdk/client-cognito-identity-provider` | `ResendConfirmationCodeCommand` |
| **Change Password** | `@aws-sdk/client-cognito-identity-provider` | `ChangePasswordCommand` |
| **Global Sign Out** | `@aws-sdk/client-cognito-identity-provider` | `GlobalSignOutCommand` |
| **Token Refresh** | `@aws-sdk/client-cognito-identity-provider` | `InitiateAuthCommand` (REFRESH_TOKEN_AUTH) |
| **Get Identity ID** | `@aws-sdk/client-cognito-identity` | `GetIdCommand` |
| **Get AWS Credentials** | `@aws-sdk/client-cognito-identity` | `GetCredentialsForIdentityCommand` |
| **Federated Login** | Browser redirect | OAuth URL |
| **Auth Guard** | Custom validation | `validateCurrentSession()` |
| **Token Validation** | Native JavaScript | JWT parsing + expiration check |
