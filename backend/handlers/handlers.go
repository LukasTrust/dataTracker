package handlers

import (
	"backend/database"
	"backend/utils"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

const (
	id               = "id"
	invalidDatasetId = "invalid dataset id"
	invalidEntryId   = "invalid entry id"

	contentTypeString = "Content-Type"
	contentType       = "application/json"
)

type Handler struct {
	DB *sql.DB
}

// CreateDatasetHandler is the handler for POST /datasets
func (h *Handler) CreateDatasetHandler(w http.ResponseWriter, r *http.Request) {
	var d database.Dataset
	if err := decodeJSON(r, &d); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	id, err := database.CreateDataset(h.DB, &d)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	d.Id = id
	writeJSON(w, d)
}

// GetDatasetHandler is the handler for GET /datasets/{id}
func (h *Handler) GetDatasetHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	d, err := database.GetDataset(h.DB, id)
	if err != nil {
		handleError(w, err, "dataset not found")
		return
	}
	writeJSON(w, d)
}

// ListDatasetsHandler is the handler for GET /datasets
func (h *Handler) ListDatasetsHandler(w http.ResponseWriter, _ *http.Request) {
	datasets, err := database.ListDatasets(h.DB)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	writeJSON(w, datasets)
}

// UpdateDatasetHandler is the handler for PUT /datasets/{id}
func (h *Handler) UpdateDatasetHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	var d database.Dataset
	if err := decodeJSON(r, &d); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	d.Id = id
	if err := database.UpdateDataset(h.DB, &d); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteDatasetHandler is the handler for DELETE /datasets/{id}
func (h *Handler) DeleteDatasetHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	if err := database.DeleteDataset(h.DB, id); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// CreateEntryHandler is the handler for POST /datasets/{datasetId}/entries
func (h *Handler) CreateEntryHandler(w http.ResponseWriter, r *http.Request) {
	datasetId, err := parseID(r, "datasetId", invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	var e database.Entry
	if err := decodeJSON(r, &e); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	e.DatasetId = datasetId
	id, err := database.CreateEntry(h.DB, &e)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	e.Id = id
	writeJSON(w, e)
}

// ListEntriesHandler is the handler for GET /datasets/{datasetId}/entries
func (h *Handler) ListEntriesHandler(w http.ResponseWriter, r *http.Request) {
	datasetId, err := parseID(r, "datasetId", invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	entries, err := database.ListEntriesByDataset(h.DB, datasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	writeJSON(w, entries)
}

// ProjectedUntilTargetHandler is the handler for GET /datasets/{datasetId}/entries/projected/target
func (h *Handler) ProjectedUntilTargetHandler(w http.ResponseWriter, r *http.Request) {
	datasetId, err := parseID(r, "datasetId", invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	dataset, err := database.GetDataset(h.DB, datasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	entries, err := database.ListEntriesByDataset(h.DB, datasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	wrapped := ProjectUntilTarget(*dataset, entries)
	writeJSON(w, wrapped)
}

// ProjectedUntilEndDateHandler is the handler for GET /datasets/{datasetId}/entries/projected/endDate
func (h *Handler) ProjectedUntilEndDateHandler(w http.ResponseWriter, r *http.Request) {
	datasetId, err := parseID(r, "datasetId", invalidDatasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	dataset, err := database.GetDataset(h.DB, datasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	entries, err := database.ListEntriesByDataset(h.DB, datasetId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	wrapped := ProjectUntilEndDate(*dataset, entries)
	writeJSON(w, wrapped)
}

// UpdateEntryHandler is the handler for PUT /datasets/{datasetId}/entries/{id}
func (h *Handler) UpdateEntryHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidEntryId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	var e database.Entry
	if err := decodeJSON(r, &e); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	e.Id = id
	if err := database.UpdateEntry(h.DB, &e); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteEntryHandler is the handler for DELETE /datasets/{datasetId}/entries/{id}
func (h *Handler) DeleteEntryHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, id, invalidEntryId)
	if err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	if err := database.DeleteEntry(h.DB, id); err != nil {
		handleErrorNoMessage(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set(contentTypeString, contentType)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		utils.Error(err.Error())
	}
}

// httpError is an error that wraps an HTTP status code
type httpError struct {
	code int
	msg  string
}

// Error implements the error interface
func (e *httpError) Error() string { return e.msg }

// parseID parses an ID from a request
func parseID(r *http.Request, key, errMsg string) (int, error) {
	idStr := mux.Vars(r)[key]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, &httpError{http.StatusBadRequest, errMsg}
	}
	return id, nil
}

// decodeJSON decodes a JSON request body into a struct
func decodeJSON(r *http.Request, v interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return &httpError{http.StatusBadRequest, err.Error()}
	}
	return nil
}

// handleErrorNoMessage is a helper function for handling errors without a message
func handleErrorNoMessage(w http.ResponseWriter, err error) {
	handleError(w, err, "")
}

// handleError handles errors by writing an error message to the response
func handleError(w http.ResponseWriter, err error, notFoundMsg string) {
	if err == nil {
		return
	}
	var httpErr *httpError
	if errors.As(err, &httpErr) {
		http.Error(w, httpErr.msg, httpErr.code)
		return
	}
	if errors.Is(err, sql.ErrNoRows) && notFoundMsg != "" {
		http.Error(w, notFoundMsg, http.StatusNotFound)
		return
	}
	http.Error(w, err.Error(), http.StatusInternalServerError)
}
