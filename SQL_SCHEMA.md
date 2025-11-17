# Esquema do Banco de Dados SQLite - App Controle CDL

Este documento descreve a estrutura completa do banco de dados SQLite local usado pelo aplicativo.

## 📊 Visão Geral

O banco de dados `cdl_app.db` contém 4 tabelas principais:

1. **romaneios** - Armazena as cargas/romaneios
2. **volumes** - Armazena os volumes bipados
3. **sync_queue** - Fila de sincronização offline-first
4. **audit_log** - Trilha de auditoria de operações

## 📋 Diagrama ER (Entity-Relationship)

```
┌─────────────────────────┐
│      romaneios          │
│─────────────────────────│
│ id_romaneio (PK)        │─┐
│ destino_id              │ │
│ status                  │ │
│ qt_volumes              │ │
│ qt_conferidos           │ │
│ qt_faltantes            │ │
│ empresa                 │ │
│ filial                  │ │
│ aglomerado              │ │
│ usuario_criacao         │ │
│ dt_criacao              │ │
│ dt_fechamento           │ │
│ dt_finalizacao          │ │
└─────────────────────────┘ │
                            │ 1:N
                            │
┌─────────────────────────┐ │
│       volumes           │ │
│─────────────────────────│ │
│ id_volume (PK)          │ │
│ id_romaneio (FK)        │─┘
│ codigo_barras (UNIQUE)  │
│ nf_chave                │
│ status                  │
│ empresa                 │
│ filial                  │
│ destino_id              │
│ dt_leitura              │
│ usuario_leitura         │
└─────────────────────────┘

┌─────────────────────────┐
│     sync_queue          │
│─────────────────────────│
│ id (PK)                 │
│ operation               │
│ endpoint                │
│ payload                 │
│ status                  │
│ retry_count             │
│ idempotency_key (UNIQUE)│
│ dt_criacao              │
│ dt_sync                 │
│ error_message           │
└─────────────────────────┘

┌─────────────────────────┐
│      audit_log          │
│─────────────────────────│
│ id (PK)                 │
│ usuario                 │
│ acao                    │
│ entidade                │
│ payload                 │
│ device_id               │
│ dt_acao                 │
└─────────────────────────┘
```

## 📝 Definição das Tabelas

### 1. romaneios

Armazena informações sobre cargas/romaneios.

```sql
CREATE TABLE IF NOT EXISTS romaneios (
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
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_romaneios_status ON romaneios(status);
```

#### Campos

| Campo | Tipo | Descrição | Obrigatório | Default |
|-------|------|-----------|-------------|---------|
| `id_romaneio` | INTEGER | ID único do romaneio (PK) | Sim | Auto |
| `destino_id` | TEXT | ID do destino (rota) | Sim | - |
| `status` | TEXT | Status atual (ver enum abaixo) | Sim | - |
| `qt_volumes` | INTEGER | Quantidade total de volumes | Não | 0 |
| `qt_conferidos` | INTEGER | Quantidade de volumes conferidos | Não | 0 |
| `qt_faltantes` | INTEGER | Quantidade de volumes faltantes | Não | 0 |
| `empresa` | TEXT | Código da empresa | Sim | - |
| `filial` | TEXT | Código da filial | Sim | - |
| `aglomerado` | TEXT | Código do aglomerado | Sim | - |
| `usuario_criacao` | TEXT | Usuário que criou o romaneio | Sim | - |
| `dt_criacao` | TEXT | Data/hora de criação (ISO 8601) | Não | CURRENT_TIMESTAMP |
| `dt_fechamento` | TEXT | Data/hora de fechamento | Não | NULL |
| `dt_finalizacao` | TEXT | Data/hora de finalização | Não | NULL |

#### Enum: status

| Valor | Descrição |
|-------|-----------|
| `EM_MONTAGEM` | Romaneio em processo de montagem (volumes sendo adicionados) |
| `FECHADA` | Romaneio fechado, aguardando finalização |
| `FINALIZADA` | Romaneio finalizado, pronto para envio/conferência |
| `CONFERIDA` | Conferência completa sem divergências |
| `CONFERIDA_DIVERGENTE` | Conferência completa com volumes faltantes |

#### Exemplo de Registro

```json
{
  "id_romaneio": 1,
  "destino_id": "SAPEZAL",
  "status": "EM_MONTAGEM",
  "qt_volumes": 5,
  "qt_conferidos": 0,
  "qt_faltantes": 0,
  "empresa": "01",
  "filial": "001",
  "aglomerado": "PR_RUBI",
  "usuario_criacao": "operador1",
  "dt_criacao": "2025-11-17T12:00:00.000Z",
  "dt_fechamento": null,
  "dt_finalizacao": null
}
```

### 2. volumes

Armazena informações sobre volumes bipados.

```sql
CREATE TABLE IF NOT EXISTS volumes (
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
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_volumes_romaneio ON volumes(id_romaneio);
CREATE INDEX IF NOT EXISTS idx_volumes_barcode ON volumes(codigo_barras);
```

#### Campos

| Campo | Tipo | Descrição | Obrigatório | Default |
|-------|------|-----------|-------------|---------|
| `id_volume` | INTEGER | ID único do volume (PK) | Sim | Auto |
| `id_romaneio` | INTEGER | ID do romaneio (FK) | Não | NULL |
| `codigo_barras` | TEXT | Código de barras único do volume | Sim | - |
| `nf_chave` | TEXT | Chave da nota fiscal | Sim | - |
| `status` | TEXT | Status do volume (ver enum abaixo) | Sim | - |
| `empresa` | TEXT | Código da empresa | Sim | - |
| `filial` | TEXT | Código da filial | Sim | - |
| `destino_id` | TEXT | ID do destino | Sim | - |
| `dt_leitura` | TEXT | Data/hora da bipagem (ISO 8601) | Não | CURRENT_TIMESTAMP |
| `usuario_leitura` | TEXT | Usuário que bipou o volume | Não | NULL |

#### Enum: status

| Valor | Descrição |
|-------|-----------|
| `PENDENTE` | Volume criado mas não associado a carga |
| `EM_CARGA` | Volume adicionado a uma carga |
| `CONFERIDO` | Volume conferido com sucesso |
| `FALTANTE` | Volume não encontrado na conferência |
| `REGULARIZADO` | Volume faltante que foi encontrado posteriormente |

#### Exemplo de Registro

```json
{
  "id_volume": 1,
  "id_romaneio": 1,
  "codigo_barras": "VOL001-2025-001",
  "nf_chave": "35250111111111111111550010000123451234567890",
  "status": "EM_CARGA",
  "empresa": "01",
  "filial": "001",
  "destino_id": "SAPEZAL",
  "dt_leitura": "2025-11-17T12:05:30.000Z",
  "usuario_leitura": "operador1"
}
```

### 3. sync_queue

Fila de sincronização offline-first.

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
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
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
```

#### Campos

| Campo | Tipo | Descrição | Obrigatório | Default |
|-------|------|-----------|-------------|---------|
| `id` | INTEGER | ID único do item (PK) | Sim | Auto |
| `operation` | TEXT | Nome da operação (ver lista abaixo) | Sim | - |
| `endpoint` | TEXT | Endpoint da API a ser chamado | Sim | - |
| `payload` | TEXT | Payload JSON stringificado | Sim | - |
| `status` | TEXT | Status da sincronização | Sim | 'PENDING' |
| `retry_count` | INTEGER | Número de tentativas de retry | Não | 0 |
| `idempotency_key` | TEXT | Chave de idempotência única | Sim | - |
| `dt_criacao` | TEXT | Data/hora de criação (ISO 8601) | Não | CURRENT_TIMESTAMP |
| `dt_sync` | TEXT | Data/hora da sincronização | Não | NULL |
| `error_message` | TEXT | Mensagem de erro (se houver) | Não | NULL |

#### Enum: operation

| Valor | Descrição |
|-------|-----------|
| `CREATE_ROMANEIO` | Criar novo romaneio |
| `ADD_VOLUME` | Adicionar volume a romaneio |
| `FECHAR_ROMANEIO` | Fechar romaneio |
| `FINALIZAR_ROMANEIO` | Finalizar romaneio |
| `FINALIZAR_CONFERENCIA` | Finalizar conferência |

#### Enum: status

| Valor | Descrição |
|-------|-----------|
| `PENDING` | Aguardando sincronização |
| `SYNCING` | Sincronizando no momento |
| `SYNCED` | Sincronizado com sucesso |
| `ERROR` | Erro permanente (max retries atingido) |

#### Exemplo de Registro

```json
{
  "id": 1,
  "operation": "CREATE_ROMANEIO",
  "endpoint": "/romaneios",
  "payload": "{\"destinoId\":\"SAPEZAL\",\"empresa\":\"01\",\"filial\":\"001\",\"aglomerado\":\"PR_RUBI\"}",
  "status": "PENDING",
  "retry_count": 0,
  "idempotency_key": "1700236800000-a1b2c3d4e5f6",
  "dt_criacao": "2025-11-17T12:00:00.000Z",
  "dt_sync": null,
  "error_message": null
}
```

### 4. audit_log

Trilha de auditoria de operações críticas.

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT NOT NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  payload TEXT NOT NULL,
  device_id TEXT NOT NULL,
  dt_acao TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_log(entidade);
```

#### Campos

| Campo | Tipo | Descrição | Obrigatório | Default |
|-------|------|-----------|-------------|---------|
| `id` | INTEGER | ID único do log (PK) | Sim | Auto |
| `usuario` | TEXT | Usuário que executou a ação | Sim | - |
| `acao` | TEXT | Nome da ação executada | Sim | - |
| `entidade` | TEXT | Entidade afetada (romaneio, volume, etc) | Sim | - |
| `payload` | TEXT | Payload JSON com detalhes da ação | Sim | - |
| `device_id` | TEXT | ID do dispositivo | Sim | - |
| `dt_acao` | TEXT | Data/hora da ação (ISO 8601) | Não | CURRENT_TIMESTAMP |

#### Ações Auditadas

- `CREATE_ROMANEIO` - Criação de romaneio
- `ADD_VOLUME` - Adição de volume
- `FECHAR_ROMANEIO` - Fechamento de romaneio
- `FINALIZAR_ROMANEIO` - Finalização de romaneio
- `FINALIZAR_CONFERENCIA` - Finalização de conferência
- `REGULARIZAR_VOLUME` - Regularização de volume faltante

#### Exemplo de Registro

```json
{
  "id": 1,
  "usuario": "operador1",
  "acao": "CREATE_ROMANEIO",
  "entidade": "romaneio",
  "payload": "{\"romaneioId\":1,\"destino\":\"SAPEZAL\"}",
  "device_id": "android-device-uuid-12345",
  "dt_acao": "2025-11-17T12:00:00.000Z"
}
```

## 🔍 Consultas Úteis

### Romaneios em Montagem

```sql
SELECT * FROM romaneios 
WHERE status = 'EM_MONTAGEM' 
ORDER BY dt_criacao DESC;
```

### Volumes de um Romaneio

```sql
SELECT v.* 
FROM volumes v
WHERE v.id_romaneio = ?
ORDER BY v.dt_leitura DESC;
```

### Itens Pendentes de Sincronização

```sql
SELECT * FROM sync_queue 
WHERE status = 'PENDING' 
ORDER BY dt_criacao ASC;
```

### Auditoria por Usuário

```sql
SELECT * FROM audit_log 
WHERE usuario = ? 
ORDER BY dt_acao DESC 
LIMIT 100;
```

### Dashboard Counts

```sql
-- Cargas Abertas
SELECT COUNT(*) FROM romaneios WHERE status = 'EM_MONTAGEM';

-- Cargas Fechadas
SELECT COUNT(*) FROM romaneios WHERE status = 'FECHADA';

-- Conferências Pendentes
SELECT COUNT(*) FROM romaneios 
WHERE status IN ('FINALIZADA', 'FECHADA') 
  AND destino_id = ?;
```

## 🔄 Migração de Schema

Para futuras versões, implemente migrations:

```typescript
// Exemplo de migration
const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS romaneios (...);
      CREATE TABLE IF NOT EXISTS volumes (...);
    `
  },
  {
    version: 2,
    sql: `
      ALTER TABLE romaneios ADD COLUMN observacao TEXT;
    `
  }
];
```

## 📊 Tamanho e Performance

### Estimativas

| Tabela | Registros Típicos | Tamanho Aprox. |
|--------|-------------------|----------------|
| romaneios | 100-1000 | ~50-500 KB |
| volumes | 1000-10000 | ~500 KB - 5 MB |
| sync_queue | 0-100 | ~10-100 KB |
| audit_log | 1000-5000 | ~100 KB - 1 MB |

### Otimizações

- Índices criados em colunas frequentemente consultadas
- Limpeza periódica de registros sincronizados (sync_queue)
- Arquivamento de logs de auditoria antigos

## 🧹 Manutenção

### Limpeza de Dados Sincronizados

```sql
-- Remover itens sincronizados há mais de 7 dias
DELETE FROM sync_queue 
WHERE status = 'SYNCED' 
  AND julianday('now') - julianday(dt_sync) > 7;
```

### Arquivar Logs Antigos

```sql
-- Arquivar logs com mais de 30 dias (implementar exportação antes)
DELETE FROM audit_log 
WHERE julianday('now') - julianday(dt_acao) > 30;
```

## 📚 Referências

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Cordova SQLite Storage Plugin](https://github.com/storesafe/cordova-sqlite-storage)
- [SQL Best Practices](https://www.sqlite.org/optoverview.html)

---

**Última Atualização:** Novembro 2025
