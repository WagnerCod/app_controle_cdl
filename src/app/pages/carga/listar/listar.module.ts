import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedComponentsModule } from '../../../components/shared-components.module';
import { ListarPage } from './listar.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedComponentsModule,
    RouterModule.forChild([{ path: '', component: ListarPage }])
  ],
  declarations: [ListarPage]
})
export class ListarPageModule {}
