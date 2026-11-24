package main

import (
	"fmt"
	"log"

	"farmasi/backend/config"
	"farmasi/backend/database"
	"farmasi/backend/routes"
)

func main() {
	log.Println("[Server] Initializing Farmasi ERP Application...")

	cfg := config.LoadConfig()

	// Connect Database
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("[Server] Database connection error: %v", err)
	}

	// Auto-Migrate Schemas
	if err := database.MigrateDB(db); err != nil {
		log.Fatalf("[Server] Database migration error: %v", err)
	}

	// Seed Initial Master & Accounting Data
	if err := database.SeedInitialData(db); err != nil {
		log.Printf("[Server] Seeding notice: %v", err)
	}

	// Pastikan seluruh data audit log ternormalisasi dengan komputer & IP riil
	database.CleanAndNormalizeAuditLogs(db)

	// Initialize Gin Router
	r := routes.SetupRouter(cfg)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[Server] Farmasi ERP API running on http://localhost%s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[Server] Failed to start server: %v", err)
	}
}
