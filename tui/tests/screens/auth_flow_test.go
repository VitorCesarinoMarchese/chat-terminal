package screens_test

import (
	"testing"

	internaldb "github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	internalmodels "github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
	internalscreens "github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	"github.com/rivo/tview"
)

func TestLoginSuccessPersistsUserAndRoutesToChatMenu(t *testing.T) {
	setupScreenTestDB(t, true)

	app := tview.NewApplication()
	var route string
	login := internalscreens.Login(app, func(name string) {
		route = name
	})

	form := formFromScreen(t, login)
	setFormInput(t, form, "Email", "alice@example.com")
	setFormInput(t, form, "Password", "access-token")
	pressFormButton(t, form, 0)

	if route != "chatmenu" {
		t.Fatalf("expected successful login route to chatmenu, got %q", route)
	}

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	var user internalmodels.User
	if queryErr := dbu.Where("username = ?", "alice@example.com").First(&user).Error; queryErr != nil {
		t.Fatalf("expected user to be persisted after login: %v", queryErr)
	}

	if user.Jwt != "access-token" || user.JwtRefresh != "access-token" {
		t.Fatalf("expected jwt fields to match submitted password, got jwt=%q refresh=%q", user.Jwt, user.JwtRefresh)
	}
}

func TestLoginRoutesToAuthWhenDBIsNotInitialized(t *testing.T) {
	_ = internaldb.CloseDB()

	app := tview.NewApplication()
	var route string
	login := internalscreens.Login(app, func(name string) {
		route = name
	})

	form := formFromScreen(t, login)
	setFormInput(t, form, "Email", "any@example.com")
	setFormInput(t, form, "Password", "any-password")
	pressFormButton(t, form, 0)

	if route != "auth" {
		t.Fatalf("expected login to route to auth on db error, got %q", route)
	}
}

func TestLoginRoutesToAuthWhenUserTableMissing(t *testing.T) {
	setupScreenTestDB(t, false)

	app := tview.NewApplication()
	var route string
	login := internalscreens.Login(app, func(name string) {
		route = name
	})

	form := formFromScreen(t, login)
	setFormInput(t, form, "Email", "missing-table@example.com")
	setFormInput(t, form, "Password", "token")
	pressFormButton(t, form, 0)

	if route != "auth" {
		t.Fatalf("expected login to route to auth when persistence fails, got %q", route)
	}
}

func TestLoginEdgeCaseEmptyCredentialsStillPersists(t *testing.T) {
	setupScreenTestDB(t, true)

	app := tview.NewApplication()
	var route string
	login := internalscreens.Login(app, func(name string) {
		route = name
	})

	form := formFromScreen(t, login)
	pressFormButton(t, form, 0)

	if route != "chatmenu" {
		t.Fatalf("expected empty credential login edge path to route chatmenu, got %q", route)
	}

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	var count int64
	if countErr := dbu.Model(&internalmodels.User{}).Where("username = ?", "").Count(&count).Error; countErr != nil {
		t.Fatalf("failed counting empty-username rows: %v", countErr)
	}
	if count != 1 {
		t.Fatalf("expected one empty-username user row for edge case, got %d", count)
	}
}

