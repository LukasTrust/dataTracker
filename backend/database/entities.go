package database

import "time"

type Dataset struct {
	Id          int        `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	TargetValue *float64   `json:"target_value"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

type Entry struct {
	Id        int
	DatasetId int
	Value     float64
	Label     string
	Date      time.Time
}
