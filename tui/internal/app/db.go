package app

import (
	"context"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type dbUtils struct {
	db  *gorm.DB
	ctx context.Context
}

func Db() dbUtils {
	db, err := gorm.Open(sqlite.Open("../state/test.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	ctx := context.Background()

	res := dbUtils{
		db,
		ctx,
	}

	return res
}
