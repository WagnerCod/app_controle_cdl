import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { DatabaseService } from '../../../services/database.service';
import { ApiService } from '../../../services/api.service';
import { SyncService } from '../../../services/sync.service';
import { ContextService } from '../../../services/context.service';

/**
 * CriarPage - RF-001, RF-002 (Criação de Carga)
 * 
 * Funcionalidades:
 * - Formulário para selecionar destino
 * - Botão para bipar volume (scanner de código de barras)
 * - Lista em tempo real de volumes bipados
 * - Totalizador de volumes
 * - Botões: Fechar Carga, Finalizar Carga
 * - Tratamento de erros (E-DUP-BARCODE com Toast)
 */

declare var cordova: any;

@Component({
  selector: 'app-criar',
  templateUrl: './criar.page.html',
  styleUrls: ['./criar.page.scss']
})
export class CriarPage implements OnInit {
  public destinos: any[] = [];
  public selectedDestino = '';
  public volumes: any[] = [];
  public romaneioId: number | null = null;
  public totalVolumes = 0;
  public vibrateOnScan = true;

  constructor(
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private databaseService: DatabaseService,
    private apiService: ApiService,
    private syncService: SyncService,
    private contextService: ContextService
  ) {}

  async ngOnInit(): Promise<void> {
    // Carrega destinos
    this.destinos = await this.apiService.getDestinos().toPromise() || [];
    
    // Carrega configuração de vibração
    const vibrateConfig = localStorage.getItem('cdl_vibrate_on_scan');
    if (vibrateConfig !== null) {
      this.vibrateOnScan = vibrateConfig === 'true';
    }
  }

  /**
   * Cria romaneio ao selecionar destino
   */
  public async onDestinoChange(): Promise<void> {
    if (!this.selectedDestino || this.romaneioId) return;

    const context = this.contextService.getContext();
    if (!context) {
      this.showToast('Contexto inválido', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Criando romaneio...'
    });
    await loading.present();

    try {
      // Cria romaneio no banco local
      this.romaneioId = await this.databaseService.createRomaneio({
        destino_id: this.selectedDestino,
        status: 'EM_MONTAGEM',
        qt_volumes: 0,
        empresa: context.empresa,
        filial: context.filial,
        aglomerado: context.aglomerado,
        usuario_criacao: context.usuario || 'operador'
      });

      // Adiciona à fila de sincronização
      await this.syncService.addToSyncQueue(
        'CREATE_ROMANEIO',
        '/romaneios',
        {
          destinoId: this.selectedDestino,
          empresa: context.empresa,
          filial: context.filial,
          aglomerado: context.aglomerado
        }
      );

      // Registra auditoria
      await this.databaseService.addAuditLog({
        usuario: context.usuario || 'operador',
        acao: 'CREATE_ROMANEIO',
        entidade: 'romaneio',
        payload: JSON.stringify({ romaneioId: this.romaneioId, destino: this.selectedDestino }),
        device_id: this.getDeviceId()
      });

      await loading.dismiss();
      this.showToast('Romaneio criado com sucesso!', 'success');

    } catch (error: any) {
      await loading.dismiss();
      console.error('Erro ao criar romaneio:', error);
      this.showToast('Erro ao criar romaneio', 'danger');
    }
  }

  /**
   * Abre scanner de código de barras
   */
  public async biparVolume(): Promise<void> {
    if (!this.romaneioId) {
      this.showToast('Selecione um destino primeiro', 'warning');
      return;
    }

    try {
      // Verifica se cordova está disponível
      if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.barcodeScanner) {
        cordova.plugins.barcodeScanner.scan(
          (result: any) => {
            if (!result.cancelled) {
              this.processarBarcode(result.text);
            }
          },
          (error: any) => {
            console.error('Erro no scanner:', error);
            this.showToast('Erro ao abrir scanner', 'danger');
          },
          {
            preferFrontCamera: false,
            showFlipCameraButton: true,
            showTorchButton: true,
            prompt: 'Posicione o código de barras na área de leitura'
          }
        );
      } else {
        // Mock para desenvolvimento web
        const mockBarcode = `VOL${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        await this.processarBarcode(mockBarcode);
      }
    } catch (error) {
      console.error('Erro ao bipar:', error);
      this.showToast('Erro ao bipar volume', 'danger');
    }
  }

  /**
   * Processa código de barras lido
   */
  private async processarBarcode(codigoBarras: string): Promise<void> {
    const context = this.contextService.getContext();
    if (!context || !this.romaneioId) return;

    try {
      // Verifica duplicidade (RN-002)
      const existente = await this.databaseService.getVolumeByBarcode(codigoBarras);
      if (existente) {
        this.showToast('Volume já adicionado (duplicidade)', 'warning');
        if (this.vibrateOnScan) this.vibrate([100, 50, 100]);
        return;
      }

      // Adiciona volume ao banco local
      await this.databaseService.addVolume({
        id_romaneio: this.romaneioId,
        codigo_barras: codigoBarras,
        nf_chave: `NF${Math.floor(Math.random() * 10000)}`, // Mock
        status: 'EM_CARGA',
        empresa: context.empresa,
        filial: context.filial,
        destino_id: this.selectedDestino,
        usuario_leitura: context.usuario || 'operador'
      });

      // Adiciona à fila de sincronização
      await this.syncService.addToSyncQueue(
        'ADD_VOLUME',
        `/romaneios/${this.romaneioId}/volumes`,
        {
          romaneioId: this.romaneioId,
          volume: {
            codigoBarras,
            nfChave: `NF${Math.floor(Math.random() * 10000)}`,
            empresa: context.empresa,
            filial: context.filial
          }
        }
      );

      // Atualiza lista
      await this.loadVolumes();

      // Feedback
      this.showToast(`Volume ${codigoBarras} adicionado!`, 'success');
      if (this.vibrateOnScan) this.vibrate([200]);

    } catch (error: any) {
      console.error('Erro ao processar barcode:', error);
      this.showToast('Erro ao adicionar volume', 'danger');
    }
  }

  /**
   * Carrega volumes do romaneio
   */
  private async loadVolumes(): Promise<void> {
    if (!this.romaneioId) return;

    this.volumes = await this.databaseService.listVolumesByRomaneio(this.romaneioId);
    this.totalVolumes = this.volumes.length;
  }

  /**
   * Fecha carga (status → FECHADA)
   */
  public async fecharCarga(): Promise<void> {
    if (!this.romaneioId) return;

    const alert = await this.alertController.create({
      header: 'Fechar Carga',
      message: `Deseja fechar a carga com ${this.totalVolumes} volumes?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Fechar',
          handler: async () => {
            await this.executarFecharCarga();
          }
        }
      ]
    });

    await alert.present();
  }

  private async executarFecharCarga(): Promise<void> {
    if (!this.romaneioId) return;

    const loading = await this.loadingController.create({
      message: 'Fechando carga...'
    });
    await loading.present();

    try {
      await this.databaseService.updateRomaneioStatus(this.romaneioId, 'FECHADA');
      
      await this.syncService.addToSyncQueue(
        'FECHAR_ROMANEIO',
        `/romaneios/${this.romaneioId}/fechar`,
        { romaneioId: this.romaneioId }
      );

      await loading.dismiss();
      this.showToast('Carga fechada com sucesso!', 'success');
      this.router.navigate(['/home']);

    } catch (error) {
      await loading.dismiss();
      console.error('Erro ao fechar carga:', error);
      this.showToast('Erro ao fechar carga', 'danger');
    }
  }

  /**
   * Finaliza carga (status → FINALIZADA)
   */
  public async finalizarCarga(): Promise<void> {
    if (!this.romaneioId) return;

    const alert = await this.alertController.create({
      header: 'Finalizar Carga',
      message: `Deseja finalizar a carga com ${this.totalVolumes} volumes? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Finalizar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            await this.executarFinalizarCarga();
          }
        }
      ]
    });

    await alert.present();
  }

  private async executarFinalizarCarga(): Promise<void> {
    if (!this.romaneioId) return;

    const loading = await this.loadingController.create({
      message: 'Finalizando carga...'
    });
    await loading.present();

    try {
      await this.databaseService.updateRomaneioStatus(this.romaneioId, 'FINALIZADA');
      
      await this.syncService.addToSyncQueue(
        'FINALIZAR_ROMANEIO',
        `/romaneios/${this.romaneioId}/finalizar`,
        { romaneioId: this.romaneioId }
      );

      await loading.dismiss();
      this.showToast('Carga finalizada com sucesso!', 'success');
      this.router.navigate(['/home']);

    } catch (error) {
      await loading.dismiss();
      console.error('Erro ao finalizar carga:', error);
      this.showToast('Erro ao finalizar carga', 'danger');
    }
  }

  /**
   * Vibra o dispositivo
   */
  private vibrate(pattern: number[]): void {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.error('Vibração não suportada:', error);
    }
  }

  /**
   * Obtém ID do dispositivo
   */
  private getDeviceId(): string {
    try {
      if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.device) {
        return cordova.plugins.device.uuid;
      }
    } catch (error) {
      console.error('Erro ao obter device ID:', error);
    }
    return 'web-browser';
  }

  /**
   * Exibe toast
   */
  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
