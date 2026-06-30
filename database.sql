-- ─────────────────────────────────────────────────────────────────────────────
-- GEOSOL Telemetry — Esquema do Banco de Dados
-- INTEGRADrillMetrics-MG v5.6
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS geosol_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE geosol_db;

-- ─── Usuários ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    senha      VARCHAR(255) NOT NULL,
    cargo      ENUM('Admin', 'Operador') DEFAULT 'Operador',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Praças de Perfuração ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pracas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    localizacao VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Sondas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sondas (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    nome     VARCHAR(100) NOT NULL,
    praca_id INT,
    status   ENUM('Operacional', 'Manutenção', 'Alerta', 'Desligada') DEFAULT 'Operacional',
    FOREIGN KEY (praca_id) REFERENCES pracas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Parâmetros de Configuração ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parametros_config (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    sonda_id   INT,
    parametro  VARCHAR(50) NOT NULL,
    valor_min  FLOAT,
    valor_max  FLOAT,
    unidade    VARCHAR(10),
    FOREIGN KEY (sonda_id) REFERENCES sondas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Histórico de Telemetria ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetria_historico (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sonda_id    INT,
    rpm         FLOAT,
    torque      FLOAT,
    pressao     FLOAT,
    temperatura FLOAT,
    gas         FLOAT,
    peso        FLOAT,
    fluxo       FLOAT,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sonda_id) REFERENCES sondas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Alertas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    sonda_id  INT,
    mensagem  VARCHAR(255),
    tipo      ENUM('Aviso', 'Crítico') DEFAULT 'Aviso',
    lido      BOOLEAN DEFAULT FALSE,
    ciente    BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sonda_id) REFERENCES sondas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Dados Iniciais ───────────────────────────────────────────────────────────
-- NOTA: Em produção, substitua as senhas por hashes bcrypt.
INSERT IGNORE INTO usuarios (nome, email, senha, cargo) VALUES
    ('Administrador', 'admin@geosol.com', 'admin123', 'Admin'),
    ('Operador Silva', 'operador@geosol.com', 'op123', 'Operador');

INSERT IGNORE INTO pracas (nome, localizacao) VALUES
    ('Praça Norte', 'Carajás, PA'),
    ('Praça Sul',   'Quadrilátero Ferrífero, MG'),
    ('Praça Oeste', 'Cuiabá, MT');

INSERT IGNORE INTO sondas (nome, praca_id, status) VALUES
    ('Sonda S-01', 1, 'Operacional'),
    ('Sonda S-02', 1, 'Alerta'),
    ('Sonda S-03', 2, 'Operacional'),
    ('Sonda S-04', 3, 'Manutenção');

-- ─── Parâmetros para Sonda 1 ──────────────────────────────────────────────────
INSERT IGNORE INTO parametros_config (sonda_id, parametro, valor_min, valor_max, unidade) VALUES
    (1, 'RPM',         0, 500,  'RPM'),
    (1, 'Torque',      0, 1000, 'Nm'),
    (1, 'Pressão',     0, 200,  'PSI'),
    (1, 'Temperatura', 0, 100,  '°C'),
    (1, 'Gás H2S',     0, 10,   'ppm'),
    (1, 'Peso',        0, 5000, 'kg'),
    (1, 'Fluxo',       0, 150,  'L/min');

-- ─── Parâmetros para Sonda 2 (FIX: antes ausentes) ───────────────────────────
INSERT IGNORE INTO parametros_config (sonda_id, parametro, valor_min, valor_max, unidade) VALUES
    (2, 'RPM',         0, 480,  'RPM'),
    (2, 'Torque',      0, 950,  'Nm'),
    (2, 'Pressão',     0, 190,  'PSI'),
    (2, 'Temperatura', 0, 95,   '°C'),
    (2, 'Gás H2S',     0, 10,   'ppm'),
    (2, 'Peso',        0, 5000, 'kg'),
    (2, 'Fluxo',       0, 140,  'L/min');

-- ─── Parâmetros para Sonda 3 (FIX: antes ausentes) ───────────────────────────
INSERT IGNORE INTO parametros_config (sonda_id, parametro, valor_min, valor_max, unidade) VALUES
    (3, 'RPM',         0, 520,  'RPM'),
    (3, 'Torque',      0, 1050, 'Nm'),
    (3, 'Pressão',     0, 210,  'PSI'),
    (3, 'Temperatura', 0, 105,  '°C'),
    (3, 'Gás H2S',     0, 10,   'ppm'),
    (3, 'Peso',        0, 5000, 'kg'),
    (3, 'Fluxo',       0, 155,  'L/min');

-- ─── Parâmetros para Sonda 4 (FIX: antes ausentes) ───────────────────────────
INSERT IGNORE INTO parametros_config (sonda_id, parametro, valor_min, valor_max, unidade) VALUES
    (4, 'RPM',         0, 460,  'RPM'),
    (4, 'Torque',      0, 900,  'Nm'),
    (4, 'Pressão',     0, 185,  'PSI'),
    (4, 'Temperatura', 0, 90,   '°C'),
    (4, 'Gás H2S',     0, 10,   'ppm'),
    (4, 'Peso',        0, 5000, 'kg'),
    (4, 'Fluxo',       0, 130,  'L/min');
