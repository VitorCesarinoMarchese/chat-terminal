package db

import (
	"errors"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var dbUtil *gorm.DB

const defaultDBPath = "internal/state/test.db"

func resolveDBPath() string {
	path := os.Getenv("TUI_DB_PATH")
	if path == "" {
		return defaultDBPath
	}
	return path
}

func InitDB() *gorm.DB {
	if dbUtil != nil {
		sqlDB, err := dbUtil.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	}

	db, err := gorm.Open(sqlite.Open(resolveDBPath()), &gorm.Config{})
	if err != nil {
		panic("connection fail")
	}

	dbUtil = db
	return db
}

func GetDB() (*gorm.DB, error) {
	if dbUtil == nil {
		return nil, errors.New("You need to init the database before using it")
	}
	return dbUtil, nil
}

func CloseDB() error {
	if dbUtil == nil {
		return nil
	}

	db, err := dbUtil.DB()
	if err != nil {
		return err
	}

	dbUtil = nil
	return db.Close()
}
