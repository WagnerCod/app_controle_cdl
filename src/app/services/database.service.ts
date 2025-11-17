import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * DatabaseService - Abstração do SQLite para persistência offline-first
 * 
 * Gerencia 4 tabelas principais:
 * - romaneios: Cargas (id_romaneio, destino_id, status, qt_volumes, empresa, filial, aglomerado)
 * - volumes: Volumes bipados (id_volume, id_romaneio, codigo_barras, nf_chave, status)
 * - sync_queue: Fila de sincronização (operation, endpoint, payload, status, retry_count, idempotency_key)
 * - audit_log: Trilha de auditoria (usuario, acao, entidade, payload, device_id)
 */

declare var window: any;

interface Romaneio {
  id_romaneio?: number;
  destino_id: string;
  status: 'EM_MONTAGEM' | 'FECHADA' | 'FINALIZADA' | 'CONFERIDA' | 'CONFERIDA_DIVERGENTE';
  qt_volumes: number;
  qt_conferidos?: number;
  qt_faltantes?: number;
  empresa: string;
  filial: string;
  aglomerado: string;
  usuario_criacao: string;
  dt_criacao?: string;
  dt_fechamento?: string;
  dt_finalizacao?: string;
}

interface Volume {
  id_volume?: number;
  id_romaneio?: number;
  codigo_barras: string;
  nf_chave: string;
  status: 'PENDENTE' | 'EM_CARGA' | 'CONFERIDO' | 'FALTANTE' | 'REGULARIZADO';
  empresa: string;
  filial: string;
  destino_id: string;
  dt_leitura?: string;
  usuario_leitura?: string;
}

interface SyncQueueItem {
  id?: number;
  operation: string;
  endpoint: string;
  payload: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR';
  retry_count: number;
  idempotency_key: string;
  dt_criacao?: string;
  dt_sync?: string;
  error_message?: string;
}

interface AuditLog {
  id?: number;
  usuario: string;
  acao: string;
  entidade: string;
  payload: string;
  device_id: string;
  dt_acao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any = null;
  private dbReady = new BehaviorSubject<boolean>(false);
  private isMockMode = true; // Mock para desenvolvimento web
  private mockData: any = {
    romaneios: [],
    volumes: [],
    sync_queue: [],
    audit_log: []
  };

  constructor() {
    this.initDatabase();
  }

  /**
   * Inicializa o banco de dados SQLite (ou mock para web)
   */
  private async initDatabase(): Promise<void> {
    try {
      // Verifica se está rodando no Cordova
      if (window.cordova && window.sqlitePlugin) {
        this.isMockMode = false;
        this.db = window.sqlitePlugin.openDatabase({
          name: 'cdl_app.db',
          location: 'default'
        });
        await this.createTables();
      } else {
        console.warn('[DatabaseService] Rodando em modo MOCK (navegador web)');
        this.isMockMode = true;
        this.initMockData();
      }
      this.dbReady.next(true);
    } catch (error) {
      console.error('[DatabaseService] Erro ao inicializar banco:', error);
      this.isMockMode = true;
      this.initMockData();
      this.dbReady.next(true);
    }
  }

  /**
   * Cria as tabelas do banco de dados
   */
  private async createTables(): Promise<void> {
    if (this.isMockMode) return;

    const tables = [
      // Tabela romaneios
      `CREATE TABLE IF NOT EXISTS romaneios (
        id_romaneio INTEGER PRIMARY KEY AUTOINCREMENT,
        destino_id TEXT NOT NULL,
        status TEXT NOT NULL,
        qt_volumes INTEGER DEFAULT 0,
        qt_conferidos INTEGER DEFAULT 0,
        qt_faltantes INTEGER DEFAULT 0,
        empresa TEXT NOT NULL,
        filial TEXT NOT NULL,
        aglomerado TEXT NOT NULL,
        usuario_criacao TEXT NOT NULL,
        dt_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
        dt_fechamento TEXT,
        dt_finalizacao TEXT
      )`,
      
      // Tabela volumes
      `CREATE TABLE IF NOT EXISTS volumes (
        id_volume INTEGER PRIMARY KEY AUTOINCREMENT,
        id_romaneio INTEGER,
        codigo_barras TEXT NOT NULL UNIQUE,
        nf_chave TEXT NOT NULL,
        status TEXT NOT NULL,
        empresa TEXT NOT NULL,
        filial TEXT NOT NULL,
        destino_id TEXT NOT NULL,
        dt_leitura TEXT DEFAULT CURRENT_TIMESTAMP,
        usuario_leitura TEXT,
        FOREIGN KEY (id_romaneio) REFERENCES romaneios(id_romaneio)
      )`,
      
      // Tabela sync_queue
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        idempotency_key TEXT NOT NULL UNIQUE,
        dt_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
        dt_sync TEXT,
        error_message TEXT
      )`,
      
      // Tabela audit_log
      `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL,
        acao TEXT NOT NULL,
        entidade TEXT NOT NULL,
        payload TEXT NOT NULL,
        device_id TEXT NOT NULL,
        dt_acao TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Índices para performance
      `CREATE INDEX IF NOT EXISTS idx_romaneios_status ON romaneios(status)`,
      `CREATE INDEX IF NOT EXISTS idx_volumes_romaneio ON volumes(id_romaneio)`,
      `CREATE INDEX IF NOT EXISTS idx_volumes_barcode ON volumes(codigo_barras)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_log(entidade)`
    ];

    for (const sql of tables) {
      await this.executeSql(sql, []);
    }
  }

  /**
   * Inicializa dados mock para desenvolvimento web
   */
  private initMockData(): void {
    this.mockData = {
      romaneios: [
        {
          id_romaneio: 1,
          destino_id: 'SAPEZAL',
          status: 'EM_MONTAGEM',
          qt_volumes: 3,
          qt_conferidos: 0,
          qt_faltantes: 0,
          empresa: '01',
          filial: '001',
          aglomerado: 'PR_RUBI',
          usuario_criacao: 'operador1',
          dt_criacao: new Date().toISOString()
        },
        {
          id_romaneio: 2,
          destino_id: 'CARAJAS',
          status: 'FECHADA',
          qt_volumes: 5,
          qt_conferidos: 0,
          qt_faltantes: 0,
          empresa: '01',
          filial: '001',
          aglomerado: 'PR_RUBI',
          usuario_criacao: 'operador1',
          dt_criacao: new Date(Date.now() - 86400000).toISOString(),
          dt_fechamento: new Date().toISOString()
        }
      ],
      volumes: [
        { id_volume: 1, id_romaneio: 1, codigo_barras: 'VOL001', nf_chave: 'NF001', status: 'EM_CARGA', empresa: '01', filial: '001', destino_id: 'SAPEZAL', dt_leitura: new Date().toISOString() },
        { id_volume: 2, id_romaneio: 1, codigo_barras: 'VOL002', nf_chave: 'NF001', status: 'EM_CARGA', empresa: '01', filial: '001', destino_id: 'SAPEZAL', dt_leitura: new Date().toISOString() },
        { id_volume: 3, id_romaneio: 1, codigo_barras: 'VOL003', nf_chave: 'NF002', status: 'EM_CARGA', empresa: '01', filial: '001', destino_id: 'SAPEZAL', dt_leitura: new Date().toISOString() }
      ],
      sync_queue: [],
      audit_log: []
    };
  }

  /**
   * Executa SQL no banco
   */
  private executeSql(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.isMockMode) {
        // Simula execução SQL em mock
        resolve({ rows: { length: 0, item: () => null } });
      } else {
        this.db.transaction((tx: any) => {
          tx.executeSql(sql, params,
            (tx: any, result: any) => resolve(result),
            (tx: any, error: any) => reject(error)
          );
        });
      }
    });
  }

  /**
   * Observable para verificar se o banco está pronto
   */
  public isDatabaseReady(): Observable<boolean> {
    return this.dbReady.asObservable();
  }

  // ==================== ROMANEIOS ====================

  public async createRomaneio(romaneio: Romaneio): Promise<number> {
    if (this.isMockMode) {
      const id = this.mockData.romaneios.length + 1;
      this.mockData.romaneios.push({ ...romaneio, id_romaneio: id, dt_criacao: new Date().toISOString() });
      return id;
    }

    const sql = `INSERT INTO romaneios (destino_id, status, qt_volumes, empresa, filial, aglomerado, usuario_criacao)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const result = await this.executeSql(sql, [
      romaneio.destino_id, romaneio.status, romaneio.qt_volumes,
      romaneio.empresa, romaneio.filial, romaneio.aglomerado, romaneio.usuario_criacao
    ]);
    return result.insertId;
  }

  public async getRomaneioById(id: number): Promise<Romaneio | null> {
    if (this.isMockMode) {
      return this.mockData.romaneios.find((r: any) => r.id_romaneio === id) || null;
    }

    const sql = `SELECT * FROM romaneios WHERE id_romaneio = ?`;
    const result = await this.executeSql(sql, [id]);
    return result.rows.length > 0 ? result.rows.item(0) : null;
  }

  public async listRomaneios(filters?: any): Promise<Romaneio[]> {
    if (this.isMockMode) {
      let results = [...this.mockData.romaneios];
      if (filters?.status) {
        results = results.filter((r: any) => r.status === filters.status);
      }
      if (filters?.destino_id) {
        results = results.filter((r: any) => r.destino_id === filters.destino_id);
      }
      return results;
    }

    let sql = `SELECT * FROM romaneios WHERE 1=1`;
    const params = [];
    
    if (filters?.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters?.destino_id) {
      sql += ` AND destino_id = ?`;
      params.push(filters.destino_id);
    }
    
    sql += ` ORDER BY dt_criacao DESC`;
    
    const result = await this.executeSql(sql, params);
    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }
    return items;
  }

  public async updateRomaneioStatus(id: number, status: string, additionalFields?: any): Promise<void> {
    if (this.isMockMode) {
      const romaneio = this.mockData.romaneios.find((r: any) => r.id_romaneio === id);
      if (romaneio) {
        romaneio.status = status;
        if (status === 'FECHADA') romaneio.dt_fechamento = new Date().toISOString();
        if (status === 'FINALIZADA') romaneio.dt_finalizacao = new Date().toISOString();
        if (additionalFields) Object.assign(romaneio, additionalFields);
      }
      return;
    }

    let sql = `UPDATE romaneios SET status = ?`;
    const params = [status];
    
    if (status === 'FECHADA') {
      sql += `, dt_fechamento = CURRENT_TIMESTAMP`;
    }
    if (status === 'FINALIZADA') {
      sql += `, dt_finalizacao = CURRENT_TIMESTAMP`;
    }
    
    sql += ` WHERE id_romaneio = ?`;
    params.push(id);
    
    await this.executeSql(sql, params);
  }

  // ==================== VOLUMES ====================

  public async addVolume(volume: Volume): Promise<number> {
    if (this.isMockMode) {
      const id = this.mockData.volumes.length + 1;
      this.mockData.volumes.push({ ...volume, id_volume: id, dt_leitura: new Date().toISOString() });
      return id;
    }

    const sql = `INSERT INTO volumes (id_romaneio, codigo_barras, nf_chave, status, empresa, filial, destino_id, usuario_leitura)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await this.executeSql(sql, [
      volume.id_romaneio, volume.codigo_barras, volume.nf_chave, volume.status,
      volume.empresa, volume.filial, volume.destino_id, volume.usuario_leitura
    ]);
    return result.insertId;
  }

  public async getVolumeByBarcode(barcode: string): Promise<Volume | null> {
    if (this.isMockMode) {
      return this.mockData.volumes.find((v: any) => v.codigo_barras === barcode) || null;
    }

    const sql = `SELECT * FROM volumes WHERE codigo_barras = ?`;
    const result = await this.executeSql(sql, [barcode]);
    return result.rows.length > 0 ? result.rows.item(0) : null;
  }

  public async listVolumesByRomaneio(romaneioId: number): Promise<Volume[]> {
    if (this.isMockMode) {
      return this.mockData.volumes.filter((v: any) => v.id_romaneio === romaneioId);
    }

    const sql = `SELECT * FROM volumes WHERE id_romaneio = ? ORDER BY dt_leitura DESC`;
    const result = await this.executeSql(sql, [romaneioId]);
    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }
    return items;
  }

  public async updateVolumeStatus(id: number, status: string): Promise<void> {
    if (this.isMockMode) {
      const volume = this.mockData.volumes.find((v: any) => v.id_volume === id);
      if (volume) {
        volume.status = status;
      }
      return;
    }

    const sql = `UPDATE volumes SET status = ? WHERE id_volume = ?`;
    await this.executeSql(sql, [status, id]);
  }

  // ==================== SYNC QUEUE ====================

  public async addToSyncQueue(item: SyncQueueItem): Promise<number> {
    if (this.isMockMode) {
      const id = this.mockData.sync_queue.length + 1;
      this.mockData.sync_queue.push({ ...item, id, dt_criacao: new Date().toISOString() });
      return id;
    }

    const sql = `INSERT INTO sync_queue (operation, endpoint, payload, status, retry_count, idempotency_key)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await this.executeSql(sql, [
      item.operation, item.endpoint, item.payload, item.status, item.retry_count, item.idempotency_key
    ]);
    return result.insertId;
  }

  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (this.isMockMode) {
      return this.mockData.sync_queue.filter((item: any) => item.status === 'PENDING');
    }

    const sql = `SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY dt_criacao ASC`;
    const result = await this.executeSql(sql, []);
    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }
    return items;
  }

  public async updateSyncItemStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    if (this.isMockMode) {
      const item = this.mockData.sync_queue.find((i: any) => i.id === id);
      if (item) {
        item.status = status;
        if (status === 'SYNCED') item.dt_sync = new Date().toISOString();
        if (errorMessage) item.error_message = errorMessage;
      }
      return;
    }

    let sql = `UPDATE sync_queue SET status = ?`;
    const params = [status];
    
    if (status === 'SYNCED') {
      sql += `, dt_sync = CURRENT_TIMESTAMP`;
    }
    if (errorMessage) {
      sql += `, error_message = ?`;
      params.push(errorMessage);
    }
    
    sql += ` WHERE id = ?`;
    params.push(id);
    
    await this.executeSql(sql, params);
  }

  // ==================== AUDIT LOG ====================

  public async addAuditLog(log: AuditLog): Promise<number> {
    if (this.isMockMode) {
      const id = this.mockData.audit_log.length + 1;
      this.mockData.audit_log.push({ ...log, id, dt_acao: new Date().toISOString() });
      return id;
    }

    const sql = `INSERT INTO audit_log (usuario, acao, entidade, payload, device_id)
                 VALUES (?, ?, ?, ?, ?)`;
    const result = await this.executeSql(sql, [
      log.usuario, log.acao, log.entidade, log.payload, log.device_id
    ]);
    return result.insertId;
  }

  // ==================== UTILITÁRIOS ====================

  public async clearAllData(): Promise<void> {
    if (this.isMockMode) {
      this.initMockData();
      return;
    }

    const tables = ['romaneios', 'volumes', 'sync_queue', 'audit_log'];
    for (const table of tables) {
      await this.executeSql(`DELETE FROM ${table}`, []);
    }
  }
}
