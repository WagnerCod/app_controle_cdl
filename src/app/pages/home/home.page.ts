import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { ContextService } from '../../services/context.service';

/**
 * HomePage - RF-008 (Painel Resumo Operacional)
 * 
 * Exibe cards com contadores:
 * - Cargas Abertas (status EM_MONTAGEM)
 * - Cargas Fechadas (status FECHADA)
 * - Conferências Pendentes
 */

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {
  public cargasAbertas = 0;
  public cargasFechadas = 0;
  public conferenciasPendentes = 0;
  public contextSummary = '';

  constructor(
    private router: Router,
    private databaseService: DatabaseService,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    this.contextSummary = this.contextService.getContextSummary();
    this.loadDashboardData();
  }

  /**
   * Carrega dados do dashboard
   */
  public async loadDashboardData(event?: any): Promise<void> {
    try {
      // Cargas abertas (EM_MONTAGEM)
      const abertas = await this.databaseService.listRomaneios({ status: 'EM_MONTAGEM' });
      this.cargasAbertas = abertas.length;

      // Cargas fechadas (FECHADA)
      const fechadas = await this.databaseService.listRomaneios({ status: 'FECHADA' });
      this.cargasFechadas = fechadas.length;

      // Conferências pendentes (romaneios com destino = filial do usuário)
      const context = this.contextService.getContext();
      if (context) {
        const allRomaneios = await this.databaseService.listRomaneios();
        this.conferenciasPendentes = allRomaneios.filter(r => 
          r.destino_id === context.filial && 
          (r.status === 'FINALIZADA' || r.status === 'FECHADA')
        ).length;
      }

      if (event) {
        event.target.complete();
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      if (event) {
        event.target.complete();
      }
    }
  }

  /**
   * Navega para criação de carga
   */
  public goToCriarCarga(): void {
    this.router.navigate(['/carga/criar']);
  }

  /**
   * Navega para listagem de cargas
   */
  public goToListarCargas(): void {
    this.router.navigate(['/carga/listar']);
  }

  /**
   * Navega para conferências pendentes
   */
  public goToConferenciasPendentes(): void {
    this.router.navigate(['/conferencia/pendentes']);
  }
}
