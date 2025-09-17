package migrations

import (
	"backend/utils"
	"database/sql"
)

const migrationsRun = "MIGRATIONS_RUN"

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
	migrationsApplied, err := wereMigrationsRun()
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
		flag    string
		msg     string
	)

	if create {
		queries = CreateDatasetsAndEntries
		flag = "true"
		msg = "Migrations applied successfully."
	} else {
		queries = DropDatasetsAndEntries
		flag = "false"
		msg = "Migrations rolled back."
	}

	if err := executeAction(db, queries); err != nil {
		utils.Error("Migration queries failed: " + err.Error())
		return err
	}

	if err := updateMigrationsRun(flag); err != nil {
		utils.Error("Failed to update migration state: " + err.Error())
		return err
	}

	utils.Success(msg)
	return nil
}

func wereMigrationsRun() (bool, error) {
	migrationsRunValue, err := utils.GetEnvVariable(migrationsRun)
	if err != nil {
		return false, err
	}
	return migrationsRunValue == "true", nil
}

func executeAction(db *sql.DB, actions []string) error {
	for _, query := range actions {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}
	return nil
}

func updateMigrationsRun(value string) error {
	if err := utils.SetEnvVariable(migrationsRun, value); err != nil {
		return err
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
