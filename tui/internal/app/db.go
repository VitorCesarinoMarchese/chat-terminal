package app

import (
	"context"
	"fmt"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type dbUtils struct {
	DB  *gorm.DB
	Ctx context.Context
}

var instance *dbUtils

func InitDB() (*dbUtils, error) {
	if instance != nil {
		return instance, nil
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "../state/test.db"
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	instance = &dbUtils{
		DB:  db,
		Ctx: context.Background(),
	}
	return instance, nil
}

func GetDB() *dbUtils {
	return instance
}
