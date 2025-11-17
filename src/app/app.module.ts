import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Componentes compartilhados
import { NetworkStatusComponent } from './components/network-status/network-status.component';

/**
 * AppModule - Módulo principal da aplicação
 * Usa NgModules (NÃO standalone)
 */

@NgModule({
  declarations: [
    AppComponent,
    NetworkStatusComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
