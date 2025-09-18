package models

import "time"

type Dataset struct {
	Id          int        `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Symbol      string     `json:"symbol"`
	TargetValue *float64   `json:"targetValue"`
	StartDate   *time.Time `json:"startDate,omitempty"`
	EndDate     *time.Time `json:"endDate,omitempty"`
}

type Entry struct {
	Id        int       `json:"id"`
	DatasetId int       `json:"datasetId"`
	Value     float64   `json:"value"`
	Label     string    `json:"label"`
	Date      time.Time `json:"date"`
	Projected bool      `json:"projected,omitempty"`
}
