package db

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type dbUtils struct {
	DB  *gorm.DB
	Ctx context.Context
}

var (
	instance *dbUtils
	once     sync.Once
	initErr  error
)

func InitDB() (*dbUtils, error) {
	once.Do(func() {

		db, err := gorm.Open(sqlite.Open("../state/test.db"), &gorm.Config{})
		if err != nil {
			log.Fatal(err)
		}

		sqlDB, err := db.DB()
		if err != nil {
			_ = sqlDB.Close()
			initErr = fmt.Errorf("getting sql.DB: %w", err)
			return
		}

		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)

		if execErr := db.Exec("PRAGMA journal_mode = WAL;").Error; execErr != nil {
			fmt.Print("Wal err")
		}

		instance = &dbUtils{
			DB:  db,
			Ctx: context.Background(),
		}
	})

	return instance, nil
}

func GetDB() (*dbUtils, error) {
	if instance == nil {
		return nil, errors.New("Db not initialized")
	}
	return instance, nil
}

func CloseDB() error {
	if instance == nil || instance.DB == nil {
		return nil
	}

	sqlDB, err := instance.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
