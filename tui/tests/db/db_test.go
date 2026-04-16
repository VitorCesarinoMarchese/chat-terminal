package db_test

import (
	"os"
	"path/filepath"
	"testing"

	internaldb "github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
)

func setupTestDB(t *testing.T) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), "state.db")
	t.Setenv("TUI_DB_PATH", path)

	internaldb.InitDB()
	t.Cleanup(func() {
		_ = internaldb.CloseDB()
	})

	return path
}

func TestGetDBReturnsErrorWhenUninitialized(t *testing.T) {
	_ = internaldb.CloseDB()

	got, err := internaldb.GetDB()
	if err == nil {
		t.Fatalf("expected error when database is not initialized")
	}
	if got != nil {
		t.Fatalf("expected nil db when uninitialized")
	}
}

func TestInitDBUsesConfiguredPath(t *testing.T) {
	path := setupTestDB(t)

	db, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	if execErr := db.Exec("CREATE TABLE IF NOT EXISTS probes (id INTEGER PRIMARY KEY)").Error; execErr != nil {
		t.Fatalf("expected SQL exec to work on initialized DB: %v", execErr)
	}

	if _, statErr := os.Stat(path); statErr != nil {
		t.Fatalf("expected sqlite DB file to exist at %s: %v", path, statErr)
	}
}

func TestCloseDBClearsGlobalConnection(t *testing.T) {
	setupTestDB(t)

	if err := internaldb.CloseDB(); err != nil {
		t.Fatalf("CloseDB() failed: %v", err)
	}

	if _, err := internaldb.GetDB(); err == nil {
		t.Fatalf("expected GetDB() to fail after CloseDB()")
	}
}

