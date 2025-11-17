import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SyncService } from '../../services/sync.service';

/**
 * NetworkStatusComponent - Indicador visual de sincronização
 * 
 * Exibe status de conexão e sincronização:
 * - 🟢 Verde: Online - Sincronizado
 * - 🟡 Amarelo: Online - Sincronizando (X itens)
 * - 🔴 Vermelho: Offline
 */

@Component({
  selector: 'app-network-status',
  templateUrl: './network-status.component.html',
  styleUrls: ['./network-status.component.scss']
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
  public isOnline = true;
  public syncStatus: 'ONLINE_SYNCED' | 'ONLINE_SYNCING' | 'OFFLINE' = 'ONLINE_SYNCED';
  public pendingCount = 0;

  private subscriptions: Subscription[] = [];

  constructor(private syncService: SyncService) {}

  ngOnInit(): void {
    // Monitora estado de conexão
    this.subscriptions.push(
      this.syncService.isOnline$.subscribe(online => {
        this.isOnline = online;
      })
    );

    // Monitora status de sincronização
    this.subscriptions.push(
      this.syncService.syncStatus$.subscribe(status => {
        this.syncStatus = status;
      })
    );

    // Monitora contagem de itens pendentes
    this.subscriptions.push(
      this.syncService.pendingCount$.subscribe(count => {
        this.pendingCount = count;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Retorna cor do indicador baseado no status
   */
  public getStatusColor(): string {
    switch (this.syncStatus) {
      case 'ONLINE_SYNCED':
        return 'success'; // Verde
      case 'ONLINE_SYNCING':
        return 'warning'; // Amarelo
      case 'OFFLINE':
        return 'danger'; // Vermelho
      default:
        return 'medium';
    }
  }

  /**
   * Retorna ícone do indicador baseado no status
   */
  public getStatusIcon(): string {
    switch (this.syncStatus) {
      case 'ONLINE_SYNCED':
        return 'cloud-done';
      case 'ONLINE_SYNCING':
        return 'cloud-upload';
      case 'OFFLINE':
        return 'cloud-offline';
      default:
        return 'help-circle';
    }
  }

  /**
   * Retorna texto do indicador
   */
  public getStatusText(): string {
    switch (this.syncStatus) {
      case 'ONLINE_SYNCED':
        return 'Online - Sincronizado';
      case 'ONLINE_SYNCING':
        return `Online - Sincronizando (${this.pendingCount} ${this.pendingCount === 1 ? 'item' : 'itens'})`;
      case 'OFFLINE':
        return this.pendingCount > 0
          ? `Offline (${this.pendingCount} ${this.pendingCount === 1 ? 'pendente' : 'pendentes'})`
          : 'Offline';
      default:
        return 'Desconhecido';
    }
  }
}
