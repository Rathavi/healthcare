import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NavigationService } from '../services/navigation.service';
import { User, UserRole } from '../models/collections/user.model';
import { CurrentUserService } from '../services/current-user.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private currentUser: CurrentUserService, private auth: AuthService, private navigation: NavigationService) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const isSignedIn = await this.auth.isSignedIn();
      if (!isSignedIn) {
        this.navigation.redirectTo('login');
        resolve(false);
      } else {
        const user: User = await this.currentUser.get();
        if (route.url[0].path === 'dashboard' && user.role === UserRole.Patient) {
          this.navigation.redirectTo('users', 'profile', user.id);
        }
        resolve(true);
      }
    });
  }

}
