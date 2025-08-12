import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ConfirmForgotPasswordComponent } from './components/confirm-forgot-password/confirm-forgot-password.component';
import { ChangePasswordAuthenticatedComponent } from './components/change-password-authenticated/change-password-authenticated.component';
import { AwsCredentialsComponent } from './components/aws-credentials/aws-credentials.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { DebugAuthComponent } from './components/debug-auth/debug-auth.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FileBrowserComponent } from './components/file-browser/file-browser.component';
import { TokenRefreshDemoComponent } from './components/token-refresh-demo/token-refresh-demo.component';
import { CognitoConfigComponent } from './components/cognito-config/cognito-config.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'debug',
    component: DebugAuthComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'confirm-forgot-password',
    component: ConfirmForgotPasswordComponent
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent
  },
  {
    path: 'change-password-authenticated',
    component: ChangePasswordAuthenticatedComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'aws-credentials',
    component: AwsCredentialsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'token-refresh-demo',
    component: TokenRefreshDemoComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'cognito-config',
    component: CognitoConfigComponent
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'file-upload',
    component: FileUploadComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'file-browser',
    component: FileBrowserComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
