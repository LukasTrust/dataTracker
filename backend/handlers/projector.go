package handlers

import (
	"backend/models"
	"sort"
	"time"
)

// ProjectUntilTarget keeps projecting until targetValue is reached.
// Stops at 0 if avgChange overshoot into negative values forever.
func ProjectUntilTarget(dataset models.Dataset, entries []models.Entry) []models.Entry {
	if dataset.TargetValue == nil || len(entries) < 2 {
		return entries
	}

	sortedEntries := sortEntriesByDate(entries)
	wrapped := sortedEntries

	avgChange, avgStep := calcAverageChange(sortedEntries)
	if avgChange == 0 {
		return wrapped
	}

	last := sortedEntries[len(sortedEntries)-1]
	return appendProjectionsUntilTarget(dataset.Id, wrapped, last, avgChange, avgStep, *dataset.TargetValue)
}

// ProjectUntilEndDate projects until dataset.EndDate (if present)
func ProjectUntilEndDate(dataset models.Dataset, entries []models.Entry) []models.Entry {
	if dataset.EndDate == nil || len(entries) < 2 {
		return entries
	}

	sortedEntries := sortEntriesByDate(entries)
	wrapped := sortedEntries

	avgChange, avgStep := calcAverageChange(sortedEntries)
	last := sortedEntries[len(sortedEntries)-1]

	return appendProjectionsUntilEndDate(dataset.Id, wrapped, last, avgChange, avgStep, *dataset.EndDate)
}

// sortEntriesByDate returns a sorted copy of entries by Date
func sortEntriesByDate(entries []models.Entry) []models.Entry {
	sorted := make([]models.Entry, len(entries))
	copy(sorted, entries)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Date.Before(sorted[j].Date) })
	return sorted
}

// appendProjectionsUntilTarget appends projected entries until targetValue is reached
func appendProjectionsUntilTarget(datasetID int, wrapped []models.Entry, last models.Entry,
	avgChange float64, avgStep time.Duration, target float64) []models.Entry {
	value := last.Value
	nextDate := last.Date.Add(avgStep)

	for {
		if (avgChange > 0 && value >= target) || (avgChange < 0 && (value <= target || value <= 0)) {
			break
		}

		value += avgChange
		if avgChange < 0 && value < 0 {
			value = 0
		}

		wrapped = append(wrapped, models.Entry{
			Id:        0,
			DatasetId: datasetID,
			Value:     value,
			Label:     "Projected",
			Date:      nextDate,
			Projected: true,
		})
		nextDate = nextDate.Add(avgStep)
	}

	return wrapped
}

// appendProjectionsUntilEndDate appends projected entries until endDate is reached
func appendProjectionsUntilEndDate(datasetID int, wrapped []models.Entry, last models.Entry,
	avgChange float64, avgStep time.Duration, endDate time.Time) []models.Entry {
	value := last.Value
	nextDate := last.Date.Add(avgStep)

	for !nextDate.After(endDate) {
		value += avgChange
		wrapped = append(wrapped, models.Entry{
			Id:        0,
			DatasetId: datasetID,
			Value:     value,
			Label:     "Projected",
			Date:      nextDate,
			Projected: true,
		})
		nextDate = nextDate.Add(avgStep)
	}

	return wrapped
}

// calcAverageChange computes the avg value delta and avg time step
func calcAverageChange(entries []models.Entry) (float64, time.Duration) {
	if len(entries) < 2 {
		return 0, 0
	}

	var totalChange float64
	var totalTime time.Duration
	for i := 1; i < len(entries); i++ {
		totalChange += entries[i].Value - entries[i-1].Value
		totalTime += entries[i].Date.Sub(entries[i-1].Date)
	}

	avgChange := totalChange / float64(len(entries)-1)
	avgStep := time.Duration(int64(totalTime) / int64(len(entries)-1))
	return avgChange, avgStep
}
