package utils

import (
	"fmt"
	"os"
	"time"
)

// ANSI color codes
const (
	colorReset   = "\033[0m"
	colorGray    = "\033[90m"
	colorGreen   = "\033[32m"
	colorYellow  = "\033[33m"
	colorRed     = "\033[31m"
	colorDarkRed = "\033[38;5;88m" // Darker red (using 256-color mode)
)

// logMessage formats and prints a log with timestamp and color
func logMessage(color string, level string, msg string) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	fmt.Printf("%s[%s] [%s] %s%s\n", color, timestamp, level, msg, colorReset)
}

func Success(msg string) {
	logMessage(colorGreen, "SUCCESS", msg)
}

func Warning(msg string) {
	logMessage(colorYellow, "WARNING", msg)
}

func Error(msg string) {
	logMessage(colorRed, "ERROR", msg)
}

func Fatal(msg string) {
	logMessage(colorDarkRed, "FATAL", msg)
	os.Exit(1)
}

func Info(msg string) {
	logMessage(colorGray, "INFO", msg)
}
