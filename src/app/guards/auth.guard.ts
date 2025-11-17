import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * AuthGuard - Proteção de rotas autenticadas
 * 
 * Verifica se usuário está autenticado (tem token no localStorage)
 * Redireciona para /login se não autenticado
 */

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const token = localStorage.getItem('cdl_auth_token');
    
    if (token) {
      return true;
    }

    console.log('[AuthGuard] Usuário não autenticado, redirecionando para /login');
    return this.router.createUrlTree(['/login']);
  }
}
