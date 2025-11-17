import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedComponentsModule } from '../../../components/shared-components.module';
import { PendentesPage } from './pendentes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedComponentsModule,
    RouterModule.forChild([{ path: '', component: PendentesPage }])
  ],
  declarations: [PendentesPage]
})
export class PendentesPageModule {}
