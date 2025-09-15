package main

import (
	"backend/migrations"
	"backend/utils"
	"database/sql"
)

func main() {
	if err := dbSetup(); err != nil {
		utils.Fatal(err.Error())
		return
	}
}

func dbSetup() error {
	db, err := utils.ConnectDB()
	if err != nil {
		return err
	}

	defer func(db *sql.DB) {
		cErr := db.Close()
		if cErr != nil {
			utils.Error(cErr.Error())
		}
	}(db)

	if mErr := migrations.Up(db); mErr != nil {
		return mErr
	}
	return nil
}
