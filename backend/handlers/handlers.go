package handlers

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

const (
	contentTypeString = "Content-Type"
	contentType       = "application/json"

	id               = "id"
	datasetId        = "datasetId"
	invalidDatasetId = "invalid dataset id"
	invalidEntryId   = "invalid entry id"
	datasetNotFound  = "dataset not found"
)

type Handler struct {
	DB *sql.DB
}

func (h *Handler) CreateDatasetHandler(w http.ResponseWriter, r *http.Request) {
	var d models.Dataset
	if err := decodeJSON(r, &d); err != nil {
		handleError(w, err, "")
		return
	}
	id, err := database.CreateDataset(h.DB, &d)
	if err != nil {
		handleError(w, err, "")
		return
	}
	d.Id = id
	writeJSON(w, d)
}

func (h *Handler) GetDatasetHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidDatasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	d, err := database.GetDataset(h.DB, id)
	handleError(w, err, datasetNotFound)
	if err == nil {
		writeJSON(w, d)
	}
}

func (h *Handler) ListDatasetsHandler(w http.ResponseWriter, _ *http.Request) {
	datasets, err := database.ListDatasets(h.DB)
	handleError(w, err, "")
	if err == nil {
		writeJSON(w, datasets)
	}
}

func (h *Handler) UpdateDatasetHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidDatasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	var d models.Dataset
	if err := decodeJSON(r, &d); err != nil {
		handleError(w, err, "")
		return
	}
	d.Id = id
	if err := database.UpdateDataset(h.DB, &d); err != nil {
		handleError(w, err, "")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteDatasetHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidDatasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	if err := database.DeleteDataset(h.DB, id); err != nil {
		handleError(w, err, "")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateEntryHandler(w http.ResponseWriter, r *http.Request) {
	datasetId, err := parseID(r, datasetId, invalidDatasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	var e models.Entry
	if err := decodeJSON(r, &e); err != nil {
		handleError(w, err, "")
		return
	}
	e.DatasetId = datasetId
	id, err := database.CreateEntry(h.DB, &e)
	if err != nil {
		handleError(w, err, "")
		return
	}
	e.Id = id
	writeJSON(w, e)
}

func (h *Handler) ListEntriesHandler(w http.ResponseWriter, r *http.Request) {
	datasetId, err := parseID(r, datasetId, invalidDatasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	entries, err := database.ListEntriesByDataset(h.DB, datasetId)
	handleError(w, err, "")
	if err == nil {
		writeJSON(w, entries)
	}
}

func (h *Handler) UpdateEntryHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidEntryId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	var e models.Entry
	if err := decodeJSON(r, &e); err != nil {
		handleError(w, err, "")
		return
	}
	e.Id = id
	if err := database.UpdateEntry(h.DB, &e); err != nil {
		handleError(w, err, "")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteEntryHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidEntryId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	if err := database.DeleteEntry(h.DB, id); err != nil {
		handleError(w, err, "")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ProjectedUntilTargetHandler(w http.ResponseWriter, r *http.Request) {
	h.projectEntries(w, r, ProjectUntilTarget)
}

func (h *Handler) ProjectedUntilEndDateHandler(w http.ResponseWriter, r *http.Request) {
	h.projectEntries(w, r, ProjectUntilEndDate)
}

// projectEntries is a generic helper for projections
func (h *Handler) projectEntries(w http.ResponseWriter, r *http.Request, projector func(models.Dataset, []models.Entry) []models.Entry,
) {
	datasetId, err := parseID(r, datasetId, invalidDatasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	dataset, err := database.GetDataset(h.DB, datasetId)
	if err != nil {
		handleError(w, err, datasetNotFound)
		return
	}
	entries, err := database.ListEntriesByDataset(h.DB, datasetId)
	if err != nil {
		handleError(w, err, "")
		return
	}
	writeJSON(w, projector(*dataset, entries))
}

// writeJSON writes a JSON response with proper headers
func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set(contentTypeString, contentType)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		utils.Error("failed to write JSON response: " + err.Error())
	}
}

// parseID parses an integer ID from request path variables
func parseID(r *http.Request, key string, msg string) (int, error) {
	idStr := mux.Vars(r)[key]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, &httpError{http.StatusBadRequest, msg}
	}
	return id, nil
}

// decodeJSON decodes JSON from request body into a struct
func decodeJSON(r *http.Request, v interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return &httpError{http.StatusBadRequest, "invalid JSON: " + err.Error()}
	}
	return nil
}

// handleError handles errors and writes HTTP responses accordingly
func handleError(w http.ResponseWriter, err error, notFoundMsg string) {
	if err == nil {
		return
	}
	var httpErr *httpError
	switch {
	case errors.As(err, &httpErr):
		http.Error(w, httpErr.msg, httpErr.code)
	case errors.Is(err, sql.ErrNoRows) && notFoundMsg != "":
		http.Error(w, notFoundMsg, http.StatusNotFound)
	default:
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// httpError wraps an HTTP status code and message
type httpError struct {
	code int
	msg  string
}

func (e *httpError) Error() string { return e.msg }
