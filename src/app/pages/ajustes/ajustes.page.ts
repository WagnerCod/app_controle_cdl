import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { SyncService } from '../../services/sync.service';

declare var cordova: any;

@Component({
  selector: 'app-ajustes',
  templateUrl: './ajustes.page.html',
  styleUrls: ['./ajustes.page.scss']
})
export class AjustesPage implements OnInit {
  public vibrateOnScan = true;
  public soundOnScan = false;
  public appVersion = '0.1.0';

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private databaseService: DatabaseService,
    private syncService: SyncService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadAppVersion();
  }

  private loadSettings(): void {
    const vibrate = localStorage.getItem('cdl_vibrate_on_scan');
    const sound = localStorage.getItem('cdl_sound_on_scan');
    this.vibrateOnScan = vibrate !== 'false';
    this.soundOnScan = sound === 'true';
  }

  private async loadAppVersion(): Promise<void> {
    try {
      if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.appVersion) {
        this.appVersion = await cordova.plugins.appVersion.getVersionNumber();
      }
    } catch (error) {
      console.error('Erro ao obter versão do app:', error);
    }
  }

  public onVibrateChange(): void {
    localStorage.setItem('cdl_vibrate_on_scan', String(this.vibrateOnScan));
  }

  public onSoundChange(): void {
    localStorage.setItem('cdl_sound_on_scan', String(this.soundOnScan));
  }

  public async forceSyncNow(): Promise<void> {
    await this.syncService.forceSyncNow();
    this.showToast('Sincronização iniciada', 'success');
  }

  public async clearCache(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Limpar Cache',
      message: 'Deseja realmente limpar todos os dados locais? Esta ação não pode ser desfeita.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Limpar',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            await this.databaseService.clearAllData();
            this.showToast('Cache limpo com sucesso', 'success');
          }
        }
      ]
    });
    await alert.present();
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
