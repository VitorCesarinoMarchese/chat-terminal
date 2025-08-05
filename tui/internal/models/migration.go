package models

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/app"
)

func migration(model ...interface{}) {
	dbu := app.GetDB()
	dbu.DB.AutoMigrate(&model)
}

func InitMigrations() {
	migration(&User{})
}
