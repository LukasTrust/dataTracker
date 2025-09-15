package utils

import (
	"database/sql"

	_ "github.com/lib/pq"
)

func ConnectDB() (*sql.DB, error) {
	databaseURL, err := getDatabaseURL()

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	// Verify connection
	if pErr := db.Ping(); pErr != nil {
		return nil, pErr
	}

	Success("Connected to database.")
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
	postgresHost, err := GetEnvVariable("POSTGRES_HOST")
	if err != nil {
		return "", err
	}
	postgresPort, err := GetEnvVariable("POSTGRES_PORT")
	if err != nil {
		return "", err
	}

	databaseURL := "postgres://" + postgresUser + ":" + postgresPassword + "@" + postgresHost + ":" + postgresPort + "/" + postgresDb + "?sslmode=disable"
	return databaseURL, nil
}
