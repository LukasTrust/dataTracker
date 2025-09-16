package database

import (
	"backend/models"
	"backend/utils"
	"database/sql"
)

// CreateDataset creates a new dataset in the database
// Returns the ID of the new dataset on success, or an error on failure
func CreateDataset(db *sql.DB, d *models.Dataset) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO datasets (name, description, symbol, target_value, start_date, end_date)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
	`, d.Name, d.Description, d.Symbol, d.TargetValue, d.StartDate, d.EndDate).Scan(&id)
	if err != nil {
		utils.Error("Failed to create dataset: " + err.Error())
		return 0, err
	}
	return id, nil
}

// UpdateDataset updates a dataset in the database
// Returns an error on failure
func UpdateDataset(db *sql.DB, d *models.Dataset) error {
	_, err := db.Exec(`
		UPDATE datasets
		SET name = $1, description = $2, symbol = $3, target_value = $4, start_date = $5, end_date = $6
		WHERE id = $7
	`, d.Name, d.Description, d.Symbol, d.TargetValue, d.StartDate, d.EndDate, d.Id)
	return err
}

// GetDataset returns a dataset from the database by ID
// Returns the dataset on success or an error on failure
func GetDataset(db *sql.DB, id int) (*models.Dataset, error) {
	d := &models.Dataset{}
	err := db.QueryRow(`
		SELECT id, name, description, symbol, target_value, start_date, end_date
		FROM datasets WHERE id = $1
	`, id).Scan(&d.Id, &d.Name, &d.Description, &d.Symbol, &d.TargetValue, &d.StartDate, &d.EndDate)
	if err != nil {
		return nil, err
	}
	return d, nil
}

// ListDatasets returns a list of all datasets in the database
// Returns a list of datasets on success or an error on failure
func ListDatasets(db *sql.DB) ([]models.Dataset, error) {
	rows, err := db.Query(`SELECT id, name, description, symbol, target_value, start_date, end_date FROM datasets`)
	if err != nil {
		return nil, err
	}
	defer func(rows *sql.Rows) {
		err := rows.Close()
		if err != nil {
			utils.Error(err.Error())
		}
	}(rows)

	var datasets []models.Dataset
	for rows.Next() {
		var d models.Dataset
		if err := rows.Scan(&d.Id, &d.Name, &d.Description, &d.Symbol, &d.TargetValue, &d.StartDate, &d.EndDate); err != nil {
			return nil, err
		}
		datasets = append(datasets, d)
	}
	return datasets, nil
}

// DeleteDataset deletes a dataset from the database by ID
// Returns an error on failure
func DeleteDataset(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM datasets WHERE id = $1`, id)
	return err
}

// CreateEntry creates a new entry in the database
// Returns the ID of the new entry on success, or an error on failure
func CreateEntry(db *sql.DB, e *models.Entry) (int, error) {
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

// UpdateEntry updates an entry in the database
// Returns an error on failure
func UpdateEntry(db *sql.DB, e *models.Entry) error {
	_, err := db.Exec(`
		UPDATE entries
		SET value = $1, label = $2, date = $3
		WHERE id = $4
	`, e.Value, e.Label, e.Date, e.Id)
	return err
}

// ListEntriesByDataset returns a list of entries in a dataset
// Returns a list of entries on success or an error on failure
func ListEntriesByDataset(db *sql.DB, datasetID int) ([]models.Entry, error) {
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

	var entries []models.Entry
	for rows.Next() {
		var e models.Entry
		if err := rows.Scan(&e.Id, &e.DatasetId, &e.Value, &e.Label, &e.Date); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// DeleteEntry deletes an entry from the database by ID
// Returns an error on failure
func DeleteEntry(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM entries WHERE id = $1`, id)
	return err
}
