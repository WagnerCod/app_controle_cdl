import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../../../services/database.service';

@Component({
  selector: 'app-listar',
  templateUrl: './listar.page.html',
  styleUrls: ['./listar.page.scss']
})
export class ListarPage implements OnInit {
  public romaneios: any[] = [];
  public filtroStatus = '';

  constructor(
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadRomaneios();
  }

  public async loadRomaneios(event?: any): Promise<void> {
    try {
      const filters = this.filtroStatus ? { status: this.filtroStatus } : undefined;
      this.romaneios = await this.databaseService.listRomaneios(filters);
      if (event) event.target.complete();
    } catch (error) {
      console.error('Erro ao carregar romaneios:', error);
      if (event) event.target.complete();
    }
  }

  public getStatusColor(status: string): string {
    const colors: any = {
      'EM_MONTAGEM': 'warning',
      'FECHADA': 'secondary',
      'FINALIZADA': 'primary',
      'CONFERIDA': 'success',
      'CONFERIDA_DIVERGENTE': 'danger'
    };
    return colors[status] || 'medium';
  }
}
