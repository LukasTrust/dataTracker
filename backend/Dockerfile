# -------- Build Stage --------
FROM golang:1.24 AS builder

# Set working directory inside container
WORKDIR /app

# Copy go.mod and go.sum first to leverage caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the backend code
COPY . .

# Build the Go binary as fully static
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o main ./.

# -------- Runtime Stage --------
FROM gcr.io/distroless/static

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port 8089
EXPOSE 8089

# Command to run the binary
CMD ["./main"]
