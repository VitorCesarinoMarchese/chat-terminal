package main

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/app"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
)

func main() {
	db.InitDB()
	defer db.CloseDB()

	models.InitMigrations()

	application := app.NewApp()

	if err := application.Run(); err != nil {
		panic(err)
	}
}
