package main

import (
	"backend/handlers"
	"backend/migrations"
	"backend/utils"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	db, err := dbSetup()
	if err != nil {
		utils.Error(err.Error())
		return
	}
	if err := httpSetup(db); err != nil {
		utils.Error(err.Error())
		return
	}
}

func dbSetup() (*sql.DB, error) {
	db, err := utils.ConnectDB()
	if err != nil {
		return nil, err
	}

	//if mErr := migrations.Down(db); mErr != nil {
	//	return nil, mErr
	//}
	if mErr := migrations.Up(db); mErr != nil {
		return nil, mErr
	}
	return db, nil
}

const (
	port = ":8080"

	// Route parts
	routeDatasets  = "/datasets"
	routeEntries   = "/entries"
	routeID        = "/{id}"
	routeDatasetID = "/{datasetId}"
	projected      = "/projected"
)

func httpSetup(db *sql.DB) error {
	utils.Info("Setting up HTTP server...")

	r := mux.NewRouter()
	h := &handlers.Handler{DB: db}

	// Dataset routes
	datasetRouter := r.PathPrefix(routeDatasets).Subrouter()
	datasetRouter.HandleFunc("", h.CreateDatasetHandler).Methods(http.MethodPost)
	datasetRouter.HandleFunc("", h.ListDatasetsHandler).Methods(http.MethodGet)
	datasetRouter.HandleFunc(routeID, h.GetDatasetHandler).Methods(http.MethodGet)
	datasetRouter.HandleFunc(routeID, h.UpdateDatasetHandler).Methods(http.MethodPut)
	datasetRouter.HandleFunc(routeID, h.DeleteDatasetHandler).Methods(http.MethodDelete)

	// Entries under dataset
	entryRouter := datasetRouter.PathPrefix(routeDatasetID + routeEntries).Subrouter()
	entryRouter.HandleFunc("", h.CreateEntryHandler).Methods(http.MethodPost)
	entryRouter.HandleFunc("", h.ListEntriesHandler).Methods(http.MethodGet)
	entryRouter.HandleFunc(projected+"/target", h.ProjectedUntilTargetHandler).Methods(http.MethodGet)
	entryRouter.HandleFunc(projected+"/endDate", h.ProjectedUntilEndDateHandler).Methods(http.MethodGet)

	// Entries by ID
	r.HandleFunc(routeEntries+routeID, h.UpdateEntryHandler).Methods(http.MethodPut)
	r.HandleFunc(routeEntries+routeID, h.DeleteEntryHandler).Methods(http.MethodDelete)

	utils.Success(fmt.Sprintf("Server starting on port %s", port))
	return http.ListenAndServe(port, enableCors(r))
}

// enableCors enables CORS for all routes
func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
