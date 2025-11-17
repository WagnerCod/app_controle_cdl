import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { ContextService } from '../services/context.service';

/**
 * ContextGuard - Proteção de rotas que requerem contexto
 * 
 * Verifica se contexto (Empresa/Filial/Aglomerado) está definido
 * Redireciona para /login se contexto inválido
 */

@Injectable({
  providedIn: 'root'
})
export class ContextGuard implements CanActivate {
  constructor(
    private contextService: ContextService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.contextService.isContextValid()) {
      return true;
    }

    console.log('[ContextGuard] Contexto inválido, redirecionando para /login');
    return this.router.createUrlTree(['/login']);
  }
}
