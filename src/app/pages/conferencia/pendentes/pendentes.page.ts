import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../../../services/database.service';
import { ContextService } from '../../../services/context.service';

@Component({
  selector: 'app-pendentes',
  templateUrl: './pendentes.page.html',
  styleUrls: ['./pendentes.page.scss']
})
export class PendentesPage implements OnInit {
  public romaneiosPendentes: any[] = [];

  constructor(
    private router: Router,
    private databaseService: DatabaseService,
    private contextService: ContextService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadPendentes();
  }

  public async loadPendentes(event?: any): Promise<void> {
    try {
      const context = this.contextService.getContext();
      if (context) {
        const all = await this.databaseService.listRomaneios();
        this.romaneiosPendentes = all.filter(r => 
          r.destino_id === context.filial && 
          (r.status === 'FINALIZADA' || r.status === 'FECHADA')
        );
      }
      if (event) event.target.complete();
    } catch (error) {
      console.error('Erro ao carregar pendentes:', error);
      if (event) event.target.complete();
    }
  }

  public goToDetalhes(id: number): void {
    this.router.navigate(['/conferencia/detalhes', id]);
  }
}
