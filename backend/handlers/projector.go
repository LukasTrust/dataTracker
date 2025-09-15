package handlers

import (
	"backend/database"
	"sort"
	"time"
)

// ProjectUntilTarget keeps projecting until targetValue is reached.
// Stops at 0 if avgChange overshoot into negative values forever.
func ProjectUntilTarget(dataset database.Dataset, entries []database.Entry) []database.EntryWrapper {
	if dataset.TargetValue == nil || len(entries) < 2 {
		return wrapRealEntries(entries)
	}

	sortedEntries := sortEntriesByDate(entries)
	wrapped := wrapRealEntries(sortedEntries)

	avgChange, avgStep := calcAverageChange(sortedEntries)
	if avgChange == 0 {
		return wrapped
	}

	last := sortedEntries[len(sortedEntries)-1]
	return appendProjectionsUntilTarget(dataset.Id, wrapped, last, avgChange, avgStep, *dataset.TargetValue)
}

// ProjectUntilEndDate projects until dataset.EndDate (if present)
func ProjectUntilEndDate(dataset database.Dataset, entries []database.Entry) []database.EntryWrapper {
	if dataset.EndDate == nil || len(entries) < 2 {
		return wrapRealEntries(entries)
	}

	sortedEntries := sortEntriesByDate(entries)
	wrapped := wrapRealEntries(sortedEntries)

	avgChange, avgStep := calcAverageChange(sortedEntries)
	last := sortedEntries[len(sortedEntries)-1]

	return appendProjectionsUntilEndDate(dataset.Id, wrapped, last, avgChange, avgStep, *dataset.EndDate)
}

// sortEntriesByDate returns a sorted copy of entries by Date
func sortEntriesByDate(entries []database.Entry) []database.Entry {
	sorted := make([]database.Entry, len(entries))
	copy(sorted, entries)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Date.Before(sorted[j].Date) })
	return sorted
}

// appendProjectionsUntilTarget appends projected entries until targetValue is reached
func appendProjectionsUntilTarget(datasetID int, wrapped []database.EntryWrapper, last database.Entry, avgChange float64, avgStep time.Duration, target float64) []database.EntryWrapper {
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

		wrapped = append(wrapped, database.EntryWrapper{
			Entry: database.Entry{
				Id:        0,
				DatasetId: datasetID,
				Value:     value,
				Label:     "Projected",
				Date:      nextDate,
			},
			Projected: true,
		})
		nextDate = nextDate.Add(avgStep)
	}

	return wrapped
}

// appendProjectionsUntilEndDate appends projected entries until endDate is reached
func appendProjectionsUntilEndDate(datasetID int, wrapped []database.EntryWrapper, last database.Entry, avgChange float64, avgStep time.Duration, endDate time.Time) []database.EntryWrapper {
	value := last.Value
	nextDate := last.Date.Add(avgStep)

	for !nextDate.After(endDate) {
		value += avgChange
		wrapped = append(wrapped, database.EntryWrapper{
			Entry: database.Entry{
				Id:        0,
				DatasetId: datasetID,
				Value:     value,
				Label:     "Projected",
				Date:      nextDate,
			},
			Projected: true,
		})
		nextDate = nextDate.Add(avgStep)
	}

	return wrapped
}

// calcAverageChange computes the avg value delta and avg time step
func calcAverageChange(entries []database.Entry) (float64, time.Duration) {
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

// wrapRealEntries wraps all existing entries
func wrapRealEntries(entries []database.Entry) []database.EntryWrapper {
	wrapped := make([]database.EntryWrapper, len(entries))
	for i, e := range entries {
		wrapped[i] = database.EntryWrapper{
			Entry:     e,
			Projected: false,
		}
	}
	return wrapped
}
