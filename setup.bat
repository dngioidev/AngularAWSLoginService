@echo off
echo ========================================
echo   Angular AWS Amplify Authentication
echo   Demo Setup Script
echo ========================================
echo.

echo Installing Angular CLI globally...
npm install -g @angular/cli

echo.
echo Installing project dependencies...
npm install

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your AWS Amplify settings in src/environments/environment.ts
echo 2. Update the amplify-config.json with your AWS Cognito details
echo 3. Run 'npm start' to start the development server
echo.
echo The application will be available at http://localhost:4200
echo.
echo ========================================
echo Troubleshooting:
echo ========================================
echo If you encounter compilation errors:
echo - Ensure Node.js version 18+ is installed
echo - Run 'npm install' again if dependencies fail
echo - Check that AWS Amplify configuration is correct
echo.
echo For zone.js errors, the polyfills.ts has been updated
echo for Angular 17 compatibility.
echo.
pause
