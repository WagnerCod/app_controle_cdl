import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * ContextService - Gerenciador de Contexto (Empresa, Filial, Aglomerado)
 * 
 * Responsabilidades:
 * - Salvar contexto em localStorage
 * - Validar contexto antes de operações críticas
 * - Emitir mudanças de contexto via BehaviorSubject
 */

export interface AppContext {
  empresa: string;
  empresaNome: string;
  filial: string;
  filialNome: string;
  aglomerado: string;
  aglomeradoNome: string;
  usuario?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {
  private readonly STORAGE_KEY = 'cdl_app_context';
  
  private contextSubject = new BehaviorSubject<AppContext | null>(null);
  public context$ = this.contextSubject.asObservable();

  constructor() {
    this.loadContextFromStorage();
  }

  /**
   * Carrega contexto do localStorage
   */
  private loadContextFromStorage(): void {
    try {
      const storedContext = localStorage.getItem(this.STORAGE_KEY);
      if (storedContext) {
        const context = JSON.parse(storedContext);
        this.contextSubject.next(context);
        console.log('[ContextService] Contexto carregado:', context);
      }
    } catch (error) {
      console.error('[ContextService] Erro ao carregar contexto:', error);
    }
  }

  /**
   * Salva contexto completo
   */
  public setContext(context: AppContext): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(context));
      this.contextSubject.next(context);
      console.log('[ContextService] Contexto salvo:', context);
    } catch (error) {
      console.error('[ContextService] Erro ao salvar contexto:', error);
    }
  }

  /**
   * Obtém contexto atual
   */
  public getContext(): AppContext | null {
    return this.contextSubject.value;
  }

  /**
   * Verifica se contexto está completo
   */
  public isContextValid(): boolean {
    const context = this.contextSubject.value;
    if (!context) return false;

    return !!(
      context.empresa &&
      context.filial &&
      context.aglomerado
    );
  }

  /**
   * Limpa contexto (logout)
   */
  public clearContext(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.contextSubject.next(null);
    console.log('[ContextService] Contexto limpo');
  }

  /**
   * Atualiza usuário no contexto
   */
  public setUsuario(usuario: string): void {
    const context = this.contextSubject.value;
    if (context) {
      context.usuario = usuario;
      this.setContext(context);
    }
  }

  /**
   * Obtém nome da empresa
   */
  public getEmpresaNome(): string {
    return this.contextSubject.value?.empresaNome || '';
  }

  /**
   * Obtém nome da filial
   */
  public getFilialNome(): string {
    return this.contextSubject.value?.filialNome || '';
  }

  /**
   * Obtém nome do aglomerado
   */
  public getAglomeradoNome(): string {
    return this.contextSubject.value?.aglomeradoNome || '';
  }

  /**
   * Obtém resumo do contexto para exibição
   */
  public getContextSummary(): string {
    const context = this.contextSubject.value;
    if (!context) return 'Sem contexto definido';

    return `${context.empresaNome} - ${context.filialNome} - ${context.aglomeradoNome}`;
  }

  /**
   * Valida se operação pode ser executada no contexto atual
   */
  public validateContextForOperation(requiredContext?: Partial<AppContext>): boolean {
    const context = this.contextSubject.value;
    if (!context || !this.isContextValid()) {
      return false;
    }

    // Valida contexto específico se fornecido
    if (requiredContext) {
      if (requiredContext.empresa && context.empresa !== requiredContext.empresa) {
        return false;
      }
      if (requiredContext.filial && context.filial !== requiredContext.filial) {
        return false;
      }
      if (requiredContext.aglomerado && context.aglomerado !== requiredContext.aglomerado) {
        return false;
      }
    }

    return true;
  }
}
