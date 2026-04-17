package screens

import (
	"errors"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
	"gorm.io/gorm"
)

var authClient services.AuthClient = services.NewHTTPAuthClient()

func SetAuthClientForTests(client services.AuthClient) {
	if client == nil {
		authClient = services.NewHTTPAuthClient()
		return
	}

	authClient = client
}

func ResetAuthClientForTests() {
	authClient = services.NewHTTPAuthClient()
}

func persistAuthSession(session services.AuthSession) error {
	dbu, err := db.GetDB()
	if err != nil {
		return err
	}

	var existing models.User
	result := dbu.Where("username = ?", session.Username).First(&existing)
	if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return result.Error
	}

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		user := models.User{
			Username:   session.Username,
			Jwt:        session.AccessToken,
			JwtRefresh: session.RefreshToken,
		}
		return dbu.Create(&user).Error
	}

	existing.Jwt = session.AccessToken
	existing.JwtRefresh = session.RefreshToken
	return dbu.Save(&existing).Error
}

