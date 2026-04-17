package models_test

import (
	"path/filepath"
	"testing"

	internaldb "github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	internalmodels "github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
)

func setupMigrationTestDB(t *testing.T) {
	t.Helper()

	path := filepath.Join(t.TempDir(), "state.db")
	t.Setenv("TUI_DB_PATH", path)
	internaldb.InitDB()

	t.Cleanup(func() {
		_ = internaldb.CloseDB()
	})
}

func TestInitMigrationsCreatesUserTable(t *testing.T) {
	setupMigrationTestDB(t)

	internalmodels.InitMigrations()

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	if !dbu.Migrator().HasTable(&internalmodels.User{}) {
		t.Fatalf("expected users table to be created by InitMigrations")
	}
}

func TestInitMigrationsSupportsPersistingMockUserData(t *testing.T) {
	setupMigrationTestDB(t)
	internalmodels.InitMigrations()

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	mockUser := internalmodels.User{
		Username:   "mock-user",
		Jwt:        "mock-access",
		JwtRefresh: "mock-refresh",
	}

	if createErr := dbu.Create(&mockUser).Error; createErr != nil {
		t.Fatalf("failed to insert mock user: %v", createErr)
	}

	var count int64
	if countErr := dbu.Model(&internalmodels.User{}).Where("username = ?", "mock-user").Count(&count).Error; countErr != nil {
		t.Fatalf("failed to count inserted mock user: %v", countErr)
	}

	if count != 1 {
		t.Fatalf("expected exactly one mock user row, got %d", count)
	}
}

