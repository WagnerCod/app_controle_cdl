import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * ApiService - Mock completo da API Protheus
 * 
 * NÃO usa HttpClient - usa RxJS (of() e delay()) para simular respostas
 * Simula todos os endpoints necessários com validações de regras de negócio
 */

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private mockDelay = 500; // Simula latência de rede
  private mockVolumes: any[] = []; // Simula banco de volumes
  private mockRomaneios: any[] = []; // Simula banco de romaneios
  private mockConferencias: any[] = []; // Simula banco de conferências

  constructor() {
    this.initMockData();
  }

  /**
   * Inicializa dados mock
   */
  private initMockData(): void {
    this.mockRomaneios = [
      {
        idRomaneio: 1001,
        destinoId: 'SAPEZAL',
        status: 'EM_MONTAGEM',
        qtVolumes: 0,
        qtConferidos: 0,
        qtFaltantes: 0,
        empresa: '01',
        filial: '001',
        aglomerado: 'PR_RUBI',
        dtCriacao: new Date().toISOString()
      },
      {
        idRomaneio: 1002,
        destinoId: 'CARAJAS',
        status: 'FECHADA',
        qtVolumes: 5,
        qtConferidos: 0,
        qtFaltantes: 0,
        empresa: '01',
        filial: '001',
        aglomerado: 'PR_RUBI',
        dtCriacao: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  // ==================== ROMANEIOS ====================

  /**
   * POST /romaneios - Criar nova carga
   */
  public createRomaneio(data: any): Observable<any> {
    console.log('[ApiService] createRomaneio:', data);

    const newRomaneio = {
      idRomaneio: this.mockRomaneios.length + 1000,
      destinoId: data.destinoId,
      status: 'EM_MONTAGEM',
      qtVolumes: 0,
      qtConferidos: 0,
      qtFaltantes: 0,
      empresa: data.empresa,
      filial: data.filial,
      aglomerado: data.aglomerado,
      dtCriacao: new Date().toISOString()
    };

    this.mockRomaneios.push(newRomaneio);

    return of({
      idRomaneio: newRomaneio.idRomaneio,
      status: 'EM_MONTAGEM',
      message: 'Romaneio criado com sucesso'
    }).pipe(delay(this.mockDelay));
  }

  /**
   * POST /romaneios/{id}/volumes - Adicionar volume à carga
   * Valida RN-002: Duplicidade é idempotente
   */
  public addVolumeToRomaneio(romaneioId: number, volume: any): Observable<any> {
    console.log('[ApiService] addVolumeToRomaneio:', romaneioId, volume);

    // Verifica duplicidade (RN-002)
    const existingVolume = this.mockVolumes.find(v => v.codigoBarras === volume.codigoBarras);
    if (existingVolume) {
      return throwError(() => ({
        errorCode: 'E-DUP-BARCODE',
        message: 'Volume já conferido ou associado à carga',
        details: { idVolume: existingVolume.idVolume }
      })).pipe(delay(this.mockDelay));
    }

    // Valida contexto (RN-004)
    const romaneio = this.mockRomaneios.find(r => r.idRomaneio === romaneioId);
    if (!romaneio) {
      return throwError(() => ({
        errorCode: 'E-ROM-NOT-FOUND',
        message: 'Romaneio não encontrado'
      })).pipe(delay(this.mockDelay));
    }

    if (volume.empresa !== romaneio.empresa || volume.filial !== romaneio.filial) {
      return throwError(() => ({
        errorCode: 'E-VOL-CONTEXTO',
        message: 'Volume não pertence à empresa/filial do contexto'
      })).pipe(delay(this.mockDelay));
    }

    // Adiciona volume
    const newVolume = {
      idVolume: this.mockVolumes.length + 1,
      idRomaneio: romaneioId,
      codigoBarras: volume.codigoBarras,
      nfChave: volume.nfChave,
      status: 'EM_CARGA',
      empresa: volume.empresa,
      filial: volume.filial,
      destinoId: romaneio.destinoId,
      dtLeitura: new Date().toISOString()
    };

    this.mockVolumes.push(newVolume);

    // Atualiza contadores do romaneio
    romaneio.qtVolumes++;

    return of({
      idVolume: newVolume.idVolume,
      status: 'EM_CARGA',
      message: 'Volume adicionado com sucesso'
    }).pipe(delay(this.mockDelay));
  }

  /**
   * POST /romaneios/{id}/fechar - Fechar carga
   */
  public fecharRomaneio(romaneioId: number): Observable<any> {
    console.log('[ApiService] fecharRomaneio:', romaneioId);

    const romaneio = this.mockRomaneios.find(r => r.idRomaneio === romaneioId);
    if (!romaneio) {
      return throwError(() => ({
        errorCode: 'E-ROM-NOT-FOUND',
        message: 'Romaneio não encontrado'
      })).pipe(delay(this.mockDelay));
    }

    romaneio.status = 'FECHADA';
    romaneio.dtFechamento = new Date().toISOString();

    return of({
      idRomaneio: romaneioId,
      status: 'FECHADA',
      message: 'Romaneio fechado com sucesso'
    }).pipe(delay(this.mockDelay));
  }

  /**
   * POST /romaneios/{id}/finalizar - Finalizar carga
   */
  public finalizarRomaneio(romaneioId: number): Observable<any> {
    console.log('[ApiService] finalizarRomaneio:', romaneioId);

    const romaneio = this.mockRomaneios.find(r => r.idRomaneio === romaneioId);
    if (!romaneio) {
      return throwError(() => ({
        errorCode: 'E-ROM-NOT-FOUND',
        message: 'Romaneio não encontrado'
      })).pipe(delay(this.mockDelay));
    }

    romaneio.status = 'FINALIZADA';
    romaneio.dtFinalizacao = new Date().toISOString();

    return of({
      idRomaneio: romaneioId,
      status: 'FINALIZADA',
      message: 'Romaneio finalizado com sucesso'
    }).pipe(delay(this.mockDelay));
  }

  /**
   * GET /romaneios - Listar romaneios com filtros
   */
  public listRomaneios(filters?: any): Observable<any> {
    console.log('[ApiService] listRomaneios:', filters);

    let results = [...this.mockRomaneios];

    if (filters?.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters?.destinoId) {
      results = results.filter(r => r.destinoId === filters.destinoId);
    }

    return of(results).pipe(delay(this.mockDelay));
  }

  /**
   * GET /romaneios/{id} - Obter detalhes de um romaneio
   */
  public getRomaneioById(romaneioId: number): Observable<any> {
    console.log('[ApiService] getRomaneioById:', romaneioId);

    const romaneio = this.mockRomaneios.find(r => r.idRomaneio === romaneioId);
    if (!romaneio) {
      return throwError(() => ({
        errorCode: 'E-ROM-NOT-FOUND',
        message: 'Romaneio não encontrado'
      })).pipe(delay(this.mockDelay));
    }

    // Busca volumes do romaneio
    const volumes = this.mockVolumes.filter(v => v.idRomaneio === romaneioId);

    return of({
      ...romaneio,
      volumes
    }).pipe(delay(this.mockDelay));
  }

  // ==================== CONFERÊNCIA ====================

  /**
   * POST /conferencias/{id}/finalizar - Finalizar conferência
   * Valida RN-013: Justificativa obrigatória para faltantes
   */
  public finalizarConferencia(romaneioId: number, justificativa?: string): Observable<any> {
    console.log('[ApiService] finalizarConferencia:', romaneioId, justificativa);

    const romaneio = this.mockRomaneios.find(r => r.idRomaneio === romaneioId);
    if (!romaneio) {
      return throwError(() => ({
        errorCode: 'E-ROM-NOT-FOUND',
        message: 'Romaneio não encontrado'
      })).pipe(delay(this.mockDelay));
    }

    // Calcula faltantes
    const volumesRomaneio = this.mockVolumes.filter(v => v.idRomaneio === romaneioId);
    const conferidos = volumesRomaneio.filter(v => v.status === 'CONFERIDO').length;
    const faltantes = volumesRomaneio.filter(v => v.status === 'FALTANTE').length;

    // RN-013: Justificativa obrigatória se houver faltantes
    if (faltantes > 0 && (!justificativa || justificativa.trim().length < 10)) {
      return throwError(() => ({
        errorCode: 'E-JUST-OBR',
        message: 'Justificativa obrigatória para volumes faltantes (mínimo 10 caracteres)'
      })).pipe(delay(this.mockDelay));
    }

    // Atualiza status
    const status = faltantes > 0 ? 'CONFERIDA_DIVERGENTE' : 'CONFERIDA';
    romaneio.status = status;
    romaneio.qtConferidos = conferidos;
    romaneio.qtFaltantes = faltantes;
    romaneio.dtConferencia = new Date().toISOString();

    if (justificativa) {
      romaneio.justificativa = justificativa;
    }

    return of({
      idRomaneio: romaneioId,
      status,
      qtConferidos: conferidos,
      qtFaltantes: faltantes,
      message: faltantes > 0 
        ? 'Conferência finalizada com divergências'
        : 'Conferência finalizada com sucesso'
    }).pipe(delay(this.mockDelay));
  }

  /**
   * POST /conferencias - Enviar leituras de conferência
   */
  public enviarLeiturasConferencia(romaneioId: number, leituras: any[]): Observable<any> {
    console.log('[ApiService] enviarLeiturasConferencia:', romaneioId, leituras);

    let recebidas = 0;
    let ignoradas = 0;

    for (const leitura of leituras) {
      const volume = this.mockVolumes.find(v => 
        v.codigoBarras === leitura.codigoBarras && v.idRomaneio === romaneioId
      );

      if (volume) {
        if (volume.status === 'CONFERIDO') {
          ignoradas++; // Duplicidade (idempotente)
        } else {
          volume.status = 'CONFERIDO';
          recebidas++;
        }
      }
    }

    return of({
      recebidas,
      ignoradasPorDuplicidade: ignoradas,
      message: 'Leituras processadas'
    }).pipe(delay(this.mockDelay));
  }

  // ==================== CONTEXTO ====================

  /**
   * GET /contexto/empresas - Listar empresas
   */
  public getEmpresas(): Observable<any[]> {
    return of([
      { id: '01', nome: 'Empresa Principal' },
      { id: '02', nome: 'Empresa Filial 1' }
    ]).pipe(delay(this.mockDelay));
  }

  /**
   * GET /contexto/filiais - Listar filiais de uma empresa
   */
  public getFiliais(empresaId: string): Observable<any[]> {
    return of([
      { id: '001', nome: 'Filial CDL - PR Rubi', empresaId: '01' },
      { id: '002', nome: 'Filial Sapezal', empresaId: '01' },
      { id: '003', nome: 'Filial Carajás', empresaId: '01' }
    ]).pipe(delay(this.mockDelay));
  }

  /**
   * GET /contexto/aglomerados - Listar aglomerados
   */
  public getAglomerados(): Observable<any[]> {
    return of([
      { id: 'PR_RUBI', nome: 'PR Rubi' },
      { id: 'SAPEZAL', nome: 'Sapezal' },
      { id: 'CARAJAS', nome: 'Carajás' }
    ]).pipe(delay(this.mockDelay));
  }

  /**
   * GET /contexto/destinos - Listar destinos (rotas)
   */
  public getDestinos(): Observable<any[]> {
    return of([
      { id: 'SAPEZAL', nome: 'Algodoeira Sapezal', ativo: true },
      { id: 'CARAJAS', nome: 'Unidade Carajás', ativo: true },
      { id: 'MATUPA', nome: 'Unidade Matupá', ativo: true },
      { id: 'SINOP', nome: 'Unidade Sinop', ativo: true }
    ]).pipe(delay(this.mockDelay));
  }

  // ==================== AUTENTICAÇÃO ====================

  /**
   * POST /auth/login - Login mockado (sempre sucesso)
   */
  public login(username: string, password: string): Observable<any> {
    console.log('[ApiService] login:', username);

    // Mock: sempre retorna sucesso
    return of({
      token: 'mock-jwt-token-' + Date.now(),
      usuario: {
        id: username,
        nome: 'Usuário Mock',
        perfil: 'OPERADOR'
      },
      message: 'Login realizado com sucesso'
    }).pipe(delay(this.mockDelay));
  }

  // ==================== UTILITÁRIOS ====================

  /**
   * Simula volume para testes
   */
  public addMockVolume(volume: any): void {
    this.mockVolumes.push(volume);
  }

  /**
   * Limpa dados mock
   */
  public clearMockData(): void {
    this.mockVolumes = [];
    this.mockRomaneios = [];
    this.mockConferencias = [];
    this.initMockData();
  }
}
