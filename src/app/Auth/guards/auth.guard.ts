import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const roles = payload.roles || [];
          if (roles.includes('ADMIN')) {
            return true;
          }
        }
      } catch (e) {
        console.error('Error parsing token in authGuard:', e);
      }
    }
  }

  router.navigate(['/login']);
  return false;
};
