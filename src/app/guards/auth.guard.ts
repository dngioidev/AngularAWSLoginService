import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // First check if already authenticated to avoid unnecessary validation
    if (this.authService.isAuthenticated()) {
      return of(true);
    }
    
    // Only validate session if not authenticated
    return from(this.authService.validateCurrentSession()).pipe(
      switchMap(() => {
        return this.authService.isAuthenticated$.pipe(
          take(1),
          map((isAuthenticated: boolean) => {
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
}
