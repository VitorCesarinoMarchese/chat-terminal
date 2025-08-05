package main

import (
	"log"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/app"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
)

func main() {
	application := app.NewApp()
	_, err := app.InitDB()
	if err != nil {
		log.Fatal(err)
	}
	models.InitMigrations()

	if err := application.Run(); err != nil {
		panic(err)
	}
}
