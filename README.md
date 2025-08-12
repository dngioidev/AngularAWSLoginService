# Angular AWS Amplify Authentication Demo

This is a demonstration Angular application that showcases user authentication using AWS Amplify with support for both traditional username/password login and federated sign-in with Microsoft Azure AD.

## Features

- **Authentication Service**: Injectable Angular service handling all authentication logic
- **Login Component**: Clean, modern login form with username/password and Microsoft sign-in options
- **Home Component**: Protected home page displaying user information
- **Route Protection**: Route guards preventing unauthorized access to protected pages
- **Modern UI**: Responsive design with clean, professional styling
- **Error Handling**: Comprehensive error handling for various authentication scenarios

## Prerequisites

Before running this application, you need to set up AWS Amplify with Cognito:

1. **AWS Account**: You need an AWS account
2. **AWS Amplify CLI**: Install and configure the Amplify CLI
3. **Cognito User Pool**: Set up a Cognito User Pool with App Client
4. **Cognito Identity Pool**: Configure an Identity Pool (optional, for additional AWS service access)
5. **OAuth Configuration**: Set up OAuth for Microsoft Azure AD integration (optional)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Amplify

Update the configuration in `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: false, // true for production
  amplify: {
    Auth: {
      Cognito: {
        region: 'us-east-1', // Your AWS region
        userPoolId: 'us-east-1_XXXXXXXXX', // Your User Pool ID
        userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
        identityPoolId: 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Your Identity Pool ID
        signUpVerificationMethod: 'code',
        loginWith: {
          oauth: {
            domain: 'your-cognito-domain.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: 'http://localhost:4200/', // Your app URL
            redirectSignOut: 'http://localhost:4200/',
            responseType: 'code'
          }
        }
      }
    }
  }
};
```

### 3. Set Up AWS Cognito

#### Create User Pool:
1. Go to AWS Cognito in your AWS Console
2. Create a new User Pool
3. Configure sign-in options (username, email)
4. Set password policies
5. Enable MFA if desired
6. Create the User Pool and note the User Pool ID

#### Create App Client:
1. In your User Pool, go to "App integration"
2. Create a new App Client
3. Note the App Client ID
4. Configure OAuth settings if using federated sign-in

#### Optional - Create Identity Pool:
1. Create a new Identity Pool
2. Associate it with your User Pool
3. Note the Identity Pool ID

### 4. Run the Application

```bash
npm start
```

The application will be available at `http://localhost:4200`.

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.html
│   │   │   └── login.component.css
│   │   └── home/
│   │       ├── home.component.ts
│   │       ├── home.component.html
│   │       └── home.component.css
│   ├── services/
│   │   └── auth.service.ts
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── app-routing.module.ts
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.component.css
│   └── app.module.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles.css
```

## Authentication Service (`src/app/services/auth.service.ts`)

The authentication service provides three main methods:

- `signIn(username, password)`: Username/password authentication with automatic SECRET_HASH calculation
- `federatedSignIn()`: Federated sign-in with Microsoft Azure AD  
- `signOut()`: User logout functionality

**Important**: This service automatically handles the SECRET_HASH calculation required when your Cognito App Client has a client secret configured. The secret hash is calculated using HMAC-SHA256 as required by AWS Cognito.

### AuthGuard (`src/app/guards/auth.guard.ts`)

Route guard that protects the home page and other authenticated routes. Automatically redirects unauthenticated users to the login page.

### LoginComponent

Provides a clean, modern login interface with:
- Username/password form
- Microsoft sign-in button
- Error handling and loading states
- Responsive design

### HomeComponent

Protected home page that displays:
- Welcome message with user information
- Authentication status
- Available features overview
- Logout functionality

## Customization

### Styling

The application uses modern CSS with:
- CSS Grid and Flexbox for layouts
- CSS Variables for consistent theming
- Responsive design principles
- Smooth animations and transitions

You can customize the look by modifying the CSS files in each component or the global styles in `src/styles.css`.

### Adding Features

To extend the application:

1. **Additional Pages**: Create new components and add them to the routing module
2. **User Profile**: Build a profile page to display and edit user information
3. **API Integration**: Use the authenticated user session to make calls to protected APIs
4. **Multi-factor Authentication**: Enable MFA in your Cognito User Pool

## Troubleshooting

### Common Issues

1. **Module not found errors**: Run `npm install` to ensure all dependencies are installed
2. **AWS configuration errors**: Verify your environment configuration matches your AWS setup
3. **CORS issues**: Ensure your OAuth redirect URLs match your application URLs
4. **Authentication failures**: Check your Cognito User Pool settings and user status

### Development Tips

- Use the browser's developer tools to inspect authentication tokens
- Check the AWS Cognito console for user management and debugging
- Enable AWS CloudWatch logs for detailed authentication debugging
- Test both username/password and federated sign-in flows

## Security Considerations

- Never commit AWS credentials or sensitive configuration to version control
- Use environment variables for production deployments
- Regularly rotate App Client secrets
- Implement proper error handling to avoid information disclosure
- Consider implementing password complexity requirements
- Enable MFA for enhanced security

## License

This project is provided as a demonstration and learning resource. Use it as a starting point for your own applications.
