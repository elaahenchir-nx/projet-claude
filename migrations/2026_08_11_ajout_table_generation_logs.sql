-- Migration : ajout de la table generation_logs
-- Objectif : journaliser les métadonnées des générations de documents
--            (sans stocker le texte généré en clair).
-- Rappel : la persistance reste éphémère par conception (voir db.ts,
-- qui recrée tout le schéma à chaque initDb()). Cette migration se
-- limite à la création de la table et de ses index.

CREATE TABLE IF NOT EXISTS generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type TEXT NOT NULL,
    document_subtype TEXT NULL,
    username TEXT NULL,
    account_id INTEGER NULL,
    status TEXT NOT NULL,
    error_message TEXT NULL,
    missing_variables_count INTEGER NULL,
    output_length INTEGER NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Index sur created_at pour les recherches/tri par date
CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at
    ON generation_logs (created_at);

-- Index composite pour filtrer par type de document et par date
CREATE INDEX IF NOT EXISTS idx_generation_logs_document_type_created_at
    ON generation_logs (document_type, created_at);
