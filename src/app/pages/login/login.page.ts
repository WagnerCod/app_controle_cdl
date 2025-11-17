import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { ContextService, AppContext } from '../../services/context.service';

/**
 * LoginPage - RF-009
 * 
 * Funcionalidades:
 * - Login mockado (sempre sucesso)
 * - Seleção obrigatória de Contexto (Empresa, Filial, Aglomerado)
 * - Botão "Entrar" só habilita após contexto completo
 */

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {
  public username = '';
  public password = '';

  public empresas: any[] = [];
  public filiais: any[] = [];
  public aglomerados: any[] = [];

  public selectedEmpresa = '';
  public selectedFilial = '';
  public selectedAglomerado = '';

  constructor(
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private apiService: ApiService,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    // Carrega dados de contexto
    this.loadContextData();
  }

  /**
   * Carrega dados de empresas, filiais e aglomerados
   */
  private async loadContextData(): Promise<void> {
    try {
      this.empresas = await this.apiService.getEmpresas().toPromise() || [];
      this.aglomerados = await this.apiService.getAglomerados().toPromise() || [];
    } catch (error) {
      console.error('Erro ao carregar dados de contexto:', error);
    }
  }

  /**
   * Handler para mudança de empresa
   * Carrega filiais da empresa selecionada
   */
  public async onEmpresaChange(): Promise<void> {
    this.selectedFilial = '';
    this.filiais = [];

    if (this.selectedEmpresa) {
      try {
        this.filiais = await this.apiService.getFiliais(this.selectedEmpresa).toPromise() || [];
      } catch (error) {
        console.error('Erro ao carregar filiais:', error);
      }
    }
  }

  /**
   * Verifica se formulário está válido
   */
  public isFormValid(): boolean {
    return !!(
      this.username &&
      this.password &&
      this.selectedEmpresa &&
      this.selectedFilial &&
      this.selectedAglomerado
    );
  }

  /**
   * Realiza login
   */
  public async login(): Promise<void> {
    if (!this.isFormValid()) {
      this.showToast('Preencha todos os campos', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Autenticando...'
    });
    await loading.present();

    try {
      // Login mockado (sempre sucesso)
      const response = await this.apiService.login(this.username, this.password).toPromise();

      // Salva token
      localStorage.setItem('cdl_auth_token', response.token);

      // Monta e salva contexto
      const empresaObj = this.empresas.find(e => e.id === this.selectedEmpresa);
      const filialObj = this.filiais.find(f => f.id === this.selectedFilial);
      const aglomeradoObj = this.aglomerados.find(a => a.id === this.selectedAglomerado);

      const context: AppContext = {
        empresa: this.selectedEmpresa,
        empresaNome: empresaObj?.nome || this.selectedEmpresa,
        filial: this.selectedFilial,
        filialNome: filialObj?.nome || this.selectedFilial,
        aglomerado: this.selectedAglomerado,
        aglomeradoNome: aglomeradoObj?.nome || this.selectedAglomerado,
        usuario: this.username
      };

      this.contextService.setContext(context);

      await loading.dismiss();
      this.showToast('Login realizado com sucesso!', 'success');
      
      // Navega para home
      this.router.navigate(['/home']);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Erro no login:', error);
      this.showToast(error.message || 'Erro ao realizar login', 'danger');
    }
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
