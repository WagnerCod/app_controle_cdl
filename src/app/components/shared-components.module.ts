import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NetworkStatusComponent } from './network-status/network-status.component';

/**
 * SharedComponentsModule - Módulo com componentes compartilhados
 * Exporta componentes para uso em outros módulos
 */

@NgModule({
  declarations: [
    NetworkStatusComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    NetworkStatusComponent
  ]
})
export class SharedComponentsModule {}
