package main

import "github.com/VitorCesarinoMarchese/chat-terminal/internal/app"

func main() {
	application := app.NewApp()
	if err := application.Run(); err != nil {
		panic(err)
	}
}
