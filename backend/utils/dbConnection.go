package utils

import (
	"database/sql"

	_ "github.com/lib/pq"
)

func ConnectDB() (*sql.DB, error) {
	Info("Connecting to database...")
	databaseURL, err := getDatabaseURL()
	if err != nil {
		return nil, err
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}
	Success("Connected to database.")

	// Verify connection
	if pErr := db.Ping(); pErr != nil {
		return nil, pErr
	}

	Success("Verified connection to database.")
	return db, nil
}

func DisconnectDB(db *sql.DB) {
	err := db.Close()
	if err != nil {
		Error(err.Error())
	} else {
		Success("Disconnected from database.")
	}
}

func getDatabaseURL() (string, error) {
	Info("Getting database URL...")
	postgresUser, err := GetEnvVariable("POSTGRES_USER")
	if err != nil {
		return "", err
	}

	postgresPassword, err := GetEnvVariable("POSTGRES_PASSWORD")
	if err != nil {
		return "", err
	}

	postgresDb, err := GetEnvVariable("POSTGRES_DB")
	if err != nil {
		return "", err
	}

	postgresHost, err := getDatabaseHost()
	if err != nil {
		return "", err
	}

	postgresPort, err := GetEnvVariable("POSTGRES_PORT")
	if err != nil {
		return "", err
	}

	databaseURL := "postgres://" + postgresUser + ":" + postgresPassword + "@" + postgresHost + ":" + postgresPort + "/" + postgresDb + "?sslmode=disable"
	Info("Retrieved database URL...")
	return databaseURL, nil
}

func getDatabaseHost() (string, error) {
	prod, err := GetEnvVariable("PRODUCTION")
	if err != nil {
		return "", err
	}

	if prod == "True" || prod == "true" {
		Info("Running db connection in production mode.")
		host, err := GetEnvVariable("DB_HOST")
		if err != nil {
			return "", err
		}

		return host, nil
	}

	Info("Running db connection in development mode.")
	return "localhost", nil
}
