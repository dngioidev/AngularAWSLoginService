import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { AuthService } from './services/auth.service';
import { S3Service } from './services/s3.service';
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    ChangePasswordComponent,
    ForgotPasswordComponent,
    ConfirmForgotPasswordComponent,
    ChangePasswordAuthenticatedComponent,
    AwsCredentialsComponent,
    VerifyEmailComponent,
    DebugAuthComponent,
    FileUploadComponent,
    FileBrowserComponent,
    TokenRefreshDemoComponent,
    CognitoConfigComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    AuthService,
    S3Service,
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
