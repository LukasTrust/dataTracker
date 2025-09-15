package database

import (
	"backend/utils"
	"database/sql"
)

func CreateDataset(db *sql.DB, d *Dataset) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO datasets (name, description, target_value, start_date, end_date)
		VALUES ($1, $2, $3, $4, $5) RETURNING id
	`, d.Name, d.Description, d.TargetValue, d.StartDate, d.EndDate).Scan(&id)
	if err != nil {
		utils.Error("Failed to create dataset: " + err.Error())
		return 0, err
	}
	return id, nil
}

func UpdateDataset(db *sql.DB, d *Dataset) error {
	_, err := db.Exec(`
		UPDATE datasets
		SET name = $1, description = $2, target_value = $3, start_date = $4, end_date = $5
		WHERE id = $6
	`, d.Name, d.Description, d.TargetValue, d.StartDate, d.EndDate, d.Id)
	return err
}

func GetDataset(db *sql.DB, id int) (*Dataset, error) {
	d := &Dataset{}
	err := db.QueryRow(`
		SELECT id, name, description, target_value, start_date, end_date
		FROM datasets WHERE id = $1
	`, id).Scan(&d.Id, &d.Name, &d.Description, &d.TargetValue, &d.StartDate, &d.EndDate)
	if err != nil {
		return nil, err
	}
	return d, nil
}

func ListDatasets(db *sql.DB) ([]Dataset, error) {
	rows, err := db.Query(`SELECT id, name, description, target_value, start_date, end_date FROM datasets`)
	if err != nil {
		return nil, err
	}
	defer func(rows *sql.Rows) {
		err := rows.Close()
		if err != nil {
			utils.Error(err.Error())
		}
	}(rows)

	var datasets []Dataset
	for rows.Next() {
		var d Dataset
		if err := rows.Scan(&d.Id, &d.Name, &d.Description, &d.TargetValue, &d.StartDate, &d.EndDate); err != nil {
			return nil, err
		}
		datasets = append(datasets, d)
	}
	return datasets, nil
}

func DeleteDataset(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM datasets WHERE id = $1`, id)
	return err
}

// Entry Handlers

func CreateEntry(db *sql.DB, e *Entry) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO entries (dataset_id, value, label, date)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, e.DatasetId, e.Value, e.Label, e.Date).Scan(&id)
	if err != nil {
		utils.Error("Failed to create entry: " + err.Error())
		return 0, err
	}
	return id, nil
}

func UpdateEntry(db *sql.DB, e *Entry) error {
	_, err := db.Exec(`
		UPDATE entries
		SET value = $1, label = $2, date = $3
		WHERE id = $4
	`, e.Value, e.Label, e.Date, e.Id)
	return err
}

func ListEntriesByDataset(db *sql.DB, datasetID int) ([]Entry, error) {
	rows, err := db.Query(`
		SELECT id, dataset_id, value, label, date
		FROM entries
		WHERE dataset_id = $1
	`, datasetID)
	if err != nil {
		return nil, err
	}
	defer func(rows *sql.Rows) {
		err := rows.Close()
		if err != nil {
			utils.Error(err.Error())
		}
	}(rows)

	var entries []Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.Id, &e.DatasetId, &e.Value, &e.Label, &e.Date); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func DeleteEntry(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM entries WHERE id = $1`, id)
	return err
}
