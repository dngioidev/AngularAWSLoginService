import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Amplify } from 'aws-amplify';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Configure Amplify before bootstrapping the application
Amplify.configure(environment.amplify);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
