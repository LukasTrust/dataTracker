package utils

import (
	"fmt"
	"os"
)

// GetEnvVariable fetches the value of an environment variable
func GetEnvVariable(variableName string) (string, error) {
	val := os.Getenv(variableName)
	if val == "" {
		return "", fmt.Errorf("environment variable %s not set", variableName)
	}
	return val, nil
}
