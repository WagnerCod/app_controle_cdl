import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { DatabaseService } from './database.service';
import { ApiService } from './api.service';

/**
 * SyncService - Gerenciador de sincronização Offline-First
 * 
 * Responsabilidades:
 * - Detectar status de conexão (online/offline)
 * - Processar fila de sincronização com retries exponenciais
 * - Emitir estados de sincronização via BehaviorSubjects
 * - Loop de sincronização automática a cada 30 segundos
 */

declare var navigator: any;
declare var Connection: any;

type SyncStatus = 'ONLINE_SYNCED' | 'ONLINE_SYNCING' | 'OFFLINE';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  // Estados observáveis
  private isOnlineSubject = new BehaviorSubject<boolean>(true);
  public isOnline$ = this.isOnlineSubject.asObservable();

  private syncStatusSubject = new BehaviorSubject<SyncStatus>('ONLINE_SYNCED');
  public syncStatus$ = this.syncStatusSubject.asObservable();

  private pendingCountSubject = new BehaviorSubject<number>(0);
  public pendingCount$ = this.pendingCountSubject.asObservable();

  private syncSubscription: Subscription | null = null;
  private isProcessingSyncQueue = false;

  constructor(
    private databaseService: DatabaseService,
    private apiService: ApiService
  ) {
    this.initNetworkMonitoring();
    this.startAutoSync();
  }

  /**
   * Inicializa monitoramento de rede
   */
  private initNetworkMonitoring(): void {
    // Tenta usar cordova-plugin-network-information
    if (navigator.connection) {
      // Detecta estado inicial
      this.updateOnlineStatus();

      // Monitora mudanças de rede
      document.addEventListener('online', () => this.handleOnline(), false);
      document.addEventListener('offline', () => this.handleOffline(), false);
    } else {
      // Fallback para navegador web
      console.warn('[SyncService] Cordova Network plugin não disponível, usando navigator.onLine');
      this.isOnlineSubject.next(navigator.onLine);
      
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Atualiza status online baseado no tipo de conexão
   */
  private updateOnlineStatus(): void {
    if (navigator.connection) {
      const networkState = navigator.connection.type;
      const isOnline = networkState !== Connection.NONE && networkState !== Connection.UNKNOWN;
      this.isOnlineSubject.next(isOnline);
    } else {
      this.isOnlineSubject.next(navigator.onLine);
    }
  }

  /**
   * Handler para evento online
   */
  private handleOnline(): void {
    console.log('[SyncService] Conectividade restaurada');
    this.isOnlineSubject.next(true);
    this.updateSyncStatus();
    this.processSyncQueue(); // Tenta sincronizar imediatamente
  }

  /**
   * Handler para evento offline
   */
  private handleOffline(): void {
    console.log('[SyncService] Conectividade perdida');
    this.isOnlineSubject.next(false);
    this.updateSyncStatus();
  }

  /**
   * Inicia loop automático de sincronização (30 segundos)
   */
  private startAutoSync(): void {
    // Aguarda banco de dados estar pronto
    this.databaseService.isDatabaseReady().subscribe(ready => {
      if (ready && !this.syncSubscription) {
        // Sincroniza imediatamente
        this.processSyncQueue();

        // Inicia loop de 30 segundos
        this.syncSubscription = interval(30000).subscribe(() => {
          if (this.isOnlineSubject.value && !this.isProcessingSyncQueue) {
            this.processSyncQueue();
          }
        });
      }
    });
  }

  /**
   * Atualiza status de sincronização baseado em estado
   */
  private updateSyncStatus(): void {
    if (!this.isOnlineSubject.value) {
      this.syncStatusSubject.next('OFFLINE');
    } else if (this.isProcessingSyncQueue) {
      this.syncStatusSubject.next('ONLINE_SYNCING');
    } else {
      this.syncStatusSubject.next('ONLINE_SYNCED');
    }
  }

  /**
   * Processa fila de sincronização
   */
  public async processSyncQueue(): Promise<void> {
    if (this.isProcessingSyncQueue) {
      console.log('[SyncService] Sincronização já em andamento, ignorando...');
      return;
    }

    if (!this.isOnlineSubject.value) {
      console.log('[SyncService] Offline, não é possível sincronizar');
      return;
    }

    this.isProcessingSyncQueue = true;
    this.updateSyncStatus();

    try {
      const pendingItems = await this.databaseService.getPendingSyncItems();
      this.pendingCountSubject.next(pendingItems.length);

      console.log(`[SyncService] Processando ${pendingItems.length} itens pendentes`);

      for (const item of pendingItems) {
        try {
          // Marca como sincronizando
          await this.databaseService.updateSyncItemStatus(item.id!, 'SYNCING');

          // Tenta sincronizar
          const payload = JSON.parse(item.payload);
          await this.syncItem(item.operation, item.endpoint, payload, item.idempotency_key);

          // Marca como sincronizado
          await this.databaseService.updateSyncItemStatus(item.id!, 'SYNCED');
          console.log(`[SyncService] Item ${item.id} sincronizado com sucesso`);

        } catch (error: any) {
          console.error(`[SyncService] Erro ao sincronizar item ${item.id}:`, error);

          // Incrementa contador de retry e calcula backoff exponencial
          const retryCount = item.retry_count + 1;
          const maxRetries = 5;

          if (retryCount >= maxRetries) {
            await this.databaseService.updateSyncItemStatus(
              item.id!,
              'ERROR',
              `Max retries atingido: ${error.message || 'Erro desconhecido'}`
            );
          } else {
            // Volta para PENDING para retry posterior
            await this.databaseService.updateSyncItemStatus(
              item.id!,
              'PENDING',
              `Retry ${retryCount}/${maxRetries}`
            );
          }
        }
      }

      // Atualiza contagem final
      const remainingItems = await this.databaseService.getPendingSyncItems();
      this.pendingCountSubject.next(remainingItems.length);

    } catch (error) {
      console.error('[SyncService] Erro ao processar fila de sincronização:', error);
    } finally {
      this.isProcessingSyncQueue = false;
      this.updateSyncStatus();
    }
  }

  /**
   * Sincroniza um item específico com a API
   */
  private async syncItem(
    operation: string,
    endpoint: string,
    payload: any,
    idempotencyKey: string
  ): Promise<any> {
    // Adiciona idempotency key no cabeçalho
    const headers = {
      'X-Idempotency-Key': idempotencyKey
    };

    console.log(`[SyncService] Sincronizando: ${operation} ${endpoint}`, payload);

    // Roteamento baseado na operação
    switch (operation) {
      case 'CREATE_ROMANEIO':
        return this.apiService.createRomaneio(payload).toPromise();
      
      case 'ADD_VOLUME':
        return this.apiService.addVolumeToRomaneio(payload.romaneioId, payload.volume).toPromise();
      
      case 'FECHAR_ROMANEIO':
        return this.apiService.fecharRomaneio(payload.romaneioId).toPromise();
      
      case 'FINALIZAR_ROMANEIO':
        return this.apiService.finalizarRomaneio(payload.romaneioId).toPromise();
      
      case 'FINALIZAR_CONFERENCIA':
        return this.apiService.finalizarConferencia(payload.romaneioId, payload.justificativa).toPromise();
      
      default:
        throw new Error(`Operação desconhecida: ${operation}`);
    }
  }

  /**
   * Força sincronização manual
   */
  public async forceSyncNow(): Promise<void> {
    console.log('[SyncService] Sincronização manual forçada');
    await this.processSyncQueue();
  }

  /**
   * Adiciona operação à fila de sincronização
   */
  public async addToSyncQueue(
    operation: string,
    endpoint: string,
    payload: any
  ): Promise<void> {
    // Gera chave de idempotência única
    const idempotencyKey = this.generateIdempotencyKey();

    await this.databaseService.addToSyncQueue({
      operation,
      endpoint,
      payload: JSON.stringify(payload),
      status: 'PENDING',
      retry_count: 0,
      idempotency_key: idempotencyKey
    });

    // Atualiza contador
    const pendingItems = await this.databaseService.getPendingSyncItems();
    this.pendingCountSubject.next(pendingItems.length);

    // Tenta sincronizar se estiver online
    if (this.isOnlineSubject.value && !this.isProcessingSyncQueue) {
      this.processSyncQueue();
    }
  }

  /**
   * Gera chave de idempotência única
   */
  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Retorna status atual de conexão
   */
  public isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  /**
   * Retorna status atual de sincronização
   */
  public getSyncStatus(): SyncStatus {
    return this.syncStatusSubject.value;
  }

  /**
   * Retorna contagem de itens pendentes
   */
  public getPendingCount(): number {
    return this.pendingCountSubject.value;
  }

  /**
   * Cleanup ao destruir serviço
   */
  public ngOnDestroy(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }
}
