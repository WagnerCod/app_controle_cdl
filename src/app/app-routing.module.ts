import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ContextGuard } from './guards/context.guard';

/**
 * Configuração de rotas com Lazy Loading
 * - Rotas públicas: /login
 * - Rotas protegidas (autenticadas + contexto): todas as demais
 */

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule),
    canActivate: [AuthGuard, ContextGuard]
  },
  {
    path: 'carga/criar',
    loadChildren: () => import('./pages/carga/criar/criar.module').then(m => m.CriarPageModule),
    canActivate: [AuthGuard, ContextGuard]
  },
  {
    path: 'carga/listar',
    loadChildren: () => import('./pages/carga/listar/listar.module').then(m => m.ListarPageModule),
    canActivate: [AuthGuard, ContextGuard]
  },
  {
    path: 'conferencia/pendentes',
    loadChildren: () => import('./pages/conferencia/pendentes/pendentes.module').then(m => m.PendentesPageModule),
    canActivate: [AuthGuard, ContextGuard]
  },
  {
    path: 'conferencia/detalhes/:id',
    loadChildren: () => import('./pages/conferencia/detalhes/detalhes.module').then(m => m.DetalhesPageModule),
    canActivate: [AuthGuard, ContextGuard]
  },
  {
    path: 'ajustes',
    loadChildren: () => import('./pages/ajustes/ajustes.module').then(m => m.AjustesPageModule),
    canActivate: [AuthGuard, ContextGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
