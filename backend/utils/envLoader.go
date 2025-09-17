package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/joho/godotenv"
)

var loadEnvOnce sync.Once
var loadErr error
var envMap map[string]string

// Default env path for local development
var envFile = "../.env"

func loadEnv() error {
	loadEnvOnce.Do(func() {
		prod := os.Getenv("PRODUCTION")
		if prod == "True" || prod == "true" {
			// In Docker, use the mounted .env file
			envFile = "/app/.env"
		}

		// Convert to an absolute path just in case
		absPath, err := filepath.Abs(envFile)
		if err != nil {
			loadErr = err
			return
		}

		// Load existing .env file into envMap
		loadErr = godotenv.Load(absPath)
		if loadErr == nil {
			envMap, _ = godotenv.Read(absPath)
		} else {
			envMap = make(map[string]string)
		}
	})
	return loadErr
}

func GetEnvVariable(variableName string) (string, error) {
	if err := loadEnv(); err != nil {
		return "", fmt.Errorf("failed to load .env: %w", err)
	}
	val := os.Getenv(variableName)
	if val == "" {
		return "", fmt.Errorf("environment variable %s not set", variableName)
	}
	return val, nil
}

func SetEnvVariable(variableName, value string) error {
	if err := loadEnv(); err != nil {
		return fmt.Errorf("failed to load .env: %w", err)
	}

	// Update in process
	if err := os.Setenv(variableName, value); err != nil {
		return err
	}

	// Update in memory map
	envMap[variableName] = value

	// Persist back to .env file
	if err := godotenv.Write(envMap, envFile); err != nil {
		return fmt.Errorf("failed to persist .env: %w", err)
	}

	return nil
}
