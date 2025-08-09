package db

import (
	"errors"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var dbUtil *gorm.DB

func InitDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("internal/state/test.db"), &gorm.Config{})
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
	return db.Close()
}
