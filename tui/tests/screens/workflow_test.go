package screens_test

import (
	"errors"
	"testing"

	internaldb "github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	internalmodels "github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
	internalscreens "github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	internalservices "github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
	"github.com/rivo/tview"
)

func TestWorkflowHomeAuthLoginToChatMenu(t *testing.T) {
	setupScreenTestDB(t, true)
	useFakeAuthClient(t, &fakeAuthClient{
		loginResult: internalservices.AuthSession{
			Username:     "workflow@example.com",
			AccessToken:  "workflow-access",
			RefreshToken: "workflow-refresh",
			UserID:       2,
		},
	})

	app := tview.NewApplication()
	pages := internalscreens.NewPages(app)

	front, primitive := pages.GetFrontPage()
	if front != "home" {
		t.Fatalf("expected initial page home, got %q", front)
	}

	homeList := listFromScreen(t, primitive)
	homeList.GetItemSelectedFunc(0)() // Home -> Auth

	front, primitive = pages.GetFrontPage()
	if front != "auth" {
		t.Fatalf("expected page auth after home selection, got %q", front)
	}

	authList := listFromScreen(t, primitive)
	authList.GetItemSelectedFunc(0)() // Auth -> Login

	front, primitive = pages.GetFrontPage()
	if front != "login" {
		t.Fatalf("expected page login after auth selection, got %q", front)
	}

	loginForm := formFromScreen(t, primitive)
	setFormInput(t, loginForm, "Email", "workflow@example.com")
	setFormInput(t, loginForm, "Password", "workflow-password")
	pressFormButton(t, loginForm, 0)

	front, _ = pages.GetFrontPage()
	if front != "chatmenu" {
		t.Fatalf("expected page chatmenu after successful workflow login, got %q", front)
	}

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	var count int64
	if countErr := dbu.Model(&internalmodels.User{}).Where("username = ?", "workflow@example.com").Count(&count).Error; countErr != nil {
		t.Fatalf("failed counting workflow user rows: %v", countErr)
	}
	if count != 1 {
		t.Fatalf("expected one persisted workflow user, got %d", count)
	}
}

func TestWorkflowLoginFailureReturnsToAuth(t *testing.T) {
	setupScreenTestDB(t, true)
	useFakeAuthClient(t, &fakeAuthClient{
		loginErr: errors.New("invalid credentials"),
	})

	app := tview.NewApplication()
	pages := internalscreens.NewPages(app)

	_, primitive := pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(0)() // Home -> Auth

	_, primitive = pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(0)() // Auth -> Login

	front, primitive := pages.GetFrontPage()
	if front != "login" {
		t.Fatalf("expected login page before submit, got %q", front)
	}

	loginForm := formFromScreen(t, primitive)
	setFormInput(t, loginForm, "Email", "no-db@example.com")
	setFormInput(t, loginForm, "Password", "token")
	pressFormButton(t, loginForm, 0)

	front, _ = pages.GetFrontPage()
	if front != "auth" {
		t.Fatalf("expected auth page after failed workflow login, got %q", front)
	}
}
