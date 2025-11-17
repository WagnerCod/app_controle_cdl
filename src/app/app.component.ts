import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { ContextService } from './services/context.service';

/**
 * AppComponent - Shell da aplicação
 * Contém ion-menu e ion-router-outlet
 */

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  public appPages = [
    {
      title: 'Início',
      url: '/home',
      icon: 'home'
    },
    {
      title: 'Criar Carga',
      url: '/carga/criar',
      icon: 'cube'
    },
    {
      title: 'Listar Cargas',
      url: '/carga/listar',
      icon: 'list'
    },
    {
      title: 'Conferências Pendentes',
      url: '/conferencia/pendentes',
      icon: 'clipboard'
    },
    {
      title: 'Ajustes',
      url: '/ajustes',
      icon: 'settings'
    }
  ];

  public contextSummary = '';
  public usuario = '';

  constructor(
    private router: Router,
    private menuController: MenuController,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    // Monitora mudanças de contexto
    this.contextService.context$.subscribe(context => {
      if (context) {
        this.contextSummary = this.contextService.getContextSummary();
        this.usuario = context.usuario || 'Usuário';
      }
    });
  }

  /**
   * Realiza logout
   */
  public logout(): void {
    localStorage.removeItem('cdl_auth_token');
    this.contextService.clearContext();
    this.menuController.close();
    this.router.navigate(['/login']);
  }
}
