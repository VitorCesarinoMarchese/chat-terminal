package models

import "github.com/VitorCesarinoMarchese/chat-terminal/internal/db"

// the lsp tould me to put any insted of ...interface{}
func migration(model any) {
	dbu, _ := db.GetDB()
	dbu.DB.AutoMigrate(&model)
}

func InitMigrations() {
	migration(&User{})
}
