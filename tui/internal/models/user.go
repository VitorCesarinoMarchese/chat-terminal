package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username   string
	Jwt        string
	JwtRefresh string
}
