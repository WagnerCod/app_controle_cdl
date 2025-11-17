import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController, ModalController } from '@ionic/angular';
import { DatabaseService } from '../../../services/database.service';
import { SyncService } from '../../../services/sync.service';

declare var cordova: any;

@Component({
  selector: 'app-detalhes',
  templateUrl: './detalhes.page.html',
  styleUrls: ['./detalhes.page.scss']
})
export class DetalhesPage implements OnInit {
  public romaneioId: number = 0;
  public romaneio: any = null;
  public volumes: any[] = [];
  public conferidos = 0;
  public faltantes = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private databaseService: DatabaseService,
    private syncService: SyncService
  ) {}

  async ngOnInit(): Promise<void> {
    this.romaneioId = Number(this.route.snapshot.paramMap.get('id'));
    await this.loadConferencia();
  }

  private async loadConferencia(): Promise<void> {
    this.romaneio = await this.databaseService.getRomaneioById(this.romaneioId);
    this.volumes = await this.databaseService.listVolumesByRomaneio(this.romaneioId);
    this.calcularTotais();
  }

  private calcularTotais(): void {
    this.conferidos = this.volumes.filter(v => v.status === 'CONFERIDO').length;
    this.faltantes = this.volumes.filter(v => v.status === 'FALTANTE' || v.status === 'EM_CARGA').length;
  }

  public async biparVolume(): Promise<void> {
    try {
      if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.barcodeScanner) {
        cordova.plugins.barcodeScanner.scan(
          async (result: any) => {
            if (!result.cancelled) {
              await this.processarConferencia(result.text);
            }
          },
          (error: any) => console.error('Erro no scanner:', error)
        );
      } else {
        const mockBarcode = this.volumes[Math.floor(Math.random() * this.volumes.length)]?.codigo_barras;
        if (mockBarcode) await this.processarConferencia(mockBarcode);
      }
    } catch (error) {
      console.error('Erro ao bipar:', error);
    }
  }

  private async processarConferencia(codigoBarras: string): Promise<void> {
    const volume = this.volumes.find(v => v.codigo_barras === codigoBarras);
    if (!volume) {
      this.showToast('Volume não pertence a esta carga', 'danger');
      return;
    }

    if (volume.status === 'CONFERIDO') {
      this.showToast('Volume já conferido', 'warning');
      return;
    }

    await this.databaseService.updateVolumeStatus(volume.id_volume, 'CONFERIDO');
    await this.loadConferencia();
    this.showToast('Volume conferido!', 'success');
  }

  public async finalizarConferencia(): Promise<void> {
    if (this.faltantes > 0) {
      const alert = await this.alertController.create({
        header: 'Justificativa Obrigatória',
        message: `Existem ${this.faltantes} volumes faltantes. Informe a justificativa (mínimo 10 caracteres):`,
        inputs: [
          {
            name: 'justificativa',
            type: 'textarea',
            placeholder: 'Digite a justificativa...'
          }
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Finalizar',
            handler: async (data) => {
              if (!data.justificativa || data.justificativa.trim().length < 10) {
                this.showToast('Justificativa deve ter no mínimo 10 caracteres', 'danger');
                return false;
              }
              await this.executarFinalizacao(data.justificativa);
              return true;
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.executarFinalizacao();
    }
  }

  private async executarFinalizacao(justificativa?: string): Promise<void> {
    await this.databaseService.updateRomaneioStatus(
      this.romaneioId,
      this.faltantes > 0 ? 'CONFERIDA_DIVERGENTE' : 'CONFERIDA'
    );

    await this.syncService.addToSyncQueue(
      'FINALIZAR_CONFERENCIA',
      `/conferencias/${this.romaneioId}/finalizar`,
      { romaneioId: this.romaneioId, justificativa }
    );

    this.showToast('Conferência finalizada!', 'success');
    this.router.navigate(['/home']);
  }

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
