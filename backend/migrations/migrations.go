package migrations

import (
	"backend/utils"
	"database/sql"
	"errors"
)

// Up runs all migrations
func Up(db *sql.DB) error {
	utils.Info("Running migrations, if necessary...")
	return runMigration(db, true)
}

// Down rolls back all migrations
func Down(db *sql.DB) error {
	utils.Info("Rolling back migrations, if necessary...")
	return runMigration(db, false)
}

// runMigration handles both Up and Down migrations
func runMigration(db *sql.DB, create bool) error {
	migrationsApplied, err := areTablesPresent(db)
	if err != nil {
		utils.Error(err.Error())
		return err
	}

	// Skip if already in the desired state
	if (create && migrationsApplied) || (!create && !migrationsApplied) {
		status := map[bool]string{true: "applied", false: "rolled back"}[create]
		utils.Info("Migrations already " + status + ". Skipping...")
		return nil
	}

	var (
		queries []string
		msg     string
	)

	if create {
		queries = CreateDatasetsAndEntries
		msg = "Migrations applied successfully."
	} else {
		queries = DropDatasetsAndEntries
		msg = "Migrations rolled back."
	}

	if err := executeAction(db, queries); err != nil {
		utils.Error("Migration queries failed: " + err.Error())
		return err
	}

	utils.Success(msg)
	return nil
}

// areTablesPresent checks if the datasets and entries tables exist
func areTablesPresent(db *sql.DB) (bool, error) {
	var tableName string

	err := db.QueryRow(`
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = 'datasets'
	`).Scan(&tableName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}

	err = db.QueryRow(`
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = 'entries'
	`).Scan(&tableName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func executeAction(db *sql.DB, actions []string) error {
	for _, query := range actions {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}
	return nil
}

var CreateDatasetsAndEntries = []string{
	`
	CREATE TABLE IF NOT EXISTS datasets (
	    id SERIAL PRIMARY KEY,
	    name TEXT NOT NULL,
	    description TEXT,
	    symbol TEXT,
	    target_value NUMERIC(15,2),
	    start_date DATE,
	    end_date DATE
	);
	`,
	`
	CREATE TABLE IF NOT EXISTS entries (
	    id SERIAL PRIMARY KEY,
	    dataset_id INT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
	    value NUMERIC(15,2) NOT NULL,
	    label TEXT,
	    date TIMESTAMP NOT NULL DEFAULT NOW()
	);
	`,
	`
	CREATE INDEX IF NOT EXISTS idx_entries_dataset_id
	ON entries(dataset_id);
	`,
}

var DropDatasetsAndEntries = []string{
	`DROP TABLE IF EXISTS entries;`,
	`DROP TABLE IF EXISTS datasets;`,
}
