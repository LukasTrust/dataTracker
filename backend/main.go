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
	port = ":8089"

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

	// Dataset subroutine
	datasetRouter := r.PathPrefix(routeDatasets).Subrouter()
	datasetRouter.HandleFunc("", h.CreateDatasetHandler).Methods(http.MethodPost)
	datasetRouter.HandleFunc("", h.ListDatasetsHandler).Methods(http.MethodGet)
	datasetRouter.HandleFunc(routeID, h.GetDatasetHandler).Methods(http.MethodGet)
	datasetRouter.HandleFunc(routeID, h.UpdateDatasetHandler).Methods(http.MethodPut)
	datasetRouter.HandleFunc(routeID, h.DeleteDatasetHandler).Methods(http.MethodDelete)

	// Entry subroutine (scoped under dataset)
	entryRouter := datasetRouter.PathPrefix(routeDatasetID + routeEntries).Subrouter()
	entryRouter.HandleFunc("", h.CreateEntryHandler).Methods(http.MethodPost)
	entryRouter.HandleFunc("", h.ListEntriesHandler).Methods(http.MethodGet)
	entryRouter.HandleFunc(projected+"/target", h.ProjectedUntilTargetHandler).Methods(http.MethodGet)
	entryRouter.HandleFunc(projected+"/endDate", h.ProjectedUntilEndDateHandler).Methods(http.MethodGet)

	// Entry routes by ID (not scoped under dataset)
	r.HandleFunc(routeEntries+routeID, h.UpdateEntryHandler).Methods(http.MethodPut)
	r.HandleFunc(routeEntries+routeID, h.DeleteEntryHandler).Methods(http.MethodDelete)

	// Wrap the router with CORS middleware
	corsRouter, err := enableCors(r)
	if err != nil {
		return err
	}

	utils.Success(fmt.Sprintf("Server starting on port %s", port))
	return http.ListenAndServe(port, corsRouter)
}

// enableCors enables CORS for all routes
func enableCors(next http.Handler) (http.Handler, error) {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	}), nil
}
