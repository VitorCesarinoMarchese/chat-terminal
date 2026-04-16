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

func TestLoginSuccessPersistsUserAndRoutesToChatMenu(t *testing.T) {
	setupScreenTestDB(t, true)
	fake := &fakeAuthClient{
		loginResult: internalservices.AuthSession{
			Username:     "alice@example.com",
			AccessToken:  "access-from-api",
			RefreshToken: "refresh-from-api",
			UserID:       42,
		},
	}
	useFakeAuthClient(t, fake)

	app := tview.NewApplication()
	var route string
	login := internalscreens.Login(app, func(name string) {
		route = name
	})

	form := formFromScreen(t, login)
	setFormInput(t, form, "Email", "alice@example.com")
	setFormInput(t, form, "Password", "password")
	pressFormButton(t, form, 0)

	if route != "chatmenu" {
		t.Fatalf("expected successful login route to chatmenu, got %q", route)
	}
	if fake.loginCalls != 1 {
		t.Fatalf("expected exactly one login API call, got %d", fake.loginCalls)
	}

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	var user internalmodels.User
	if queryErr := dbu.Where("username = ?", "alice@example.com").First(&user).Error; queryErr != nil {
		t.Fatalf("expected user to be persisted after login: %v", queryErr)
	}

	if user.Jwt != "access-from-api" || user.JwtRefresh != "refresh-from-api" {
		t.Fatalf("expected jwt fields to match submitted password, got jwt=%q refresh=%q", user.Jwt, user.JwtRefresh)
	}
}

func TestLoginRoutesToAuthWhenAPIReturnsError(t *testing.T) {
	setupScreenTestDB(t, true)
	fake := &fakeAuthClient{
		loginErr: errors.New("unauthorized"),
	}
	useFakeAuthClient(t, fake)

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
		t.Fatalf("expected login to route to auth on api error, got %q", route)
	}
	if fake.loginCalls != 1 {
		t.Fatalf("expected exactly one login API call, got %d", fake.loginCalls)
	}
}

func TestLoginRoutesToAuthWhenPersistenceFails(t *testing.T) {
	setupScreenTestDB(t, false)
	fake := &fakeAuthClient{
		loginResult: internalservices.AuthSession{
			Username:     "missing-table@example.com",
			AccessToken:  "access",
			RefreshToken: "refresh",
			UserID:       1,
		},
	}
	useFakeAuthClient(t, fake)

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

func TestLoginEdgeCaseEmptyCredentialsRoutesToAuth(t *testing.T) {
	setupScreenTestDB(t, true)
	fake := &fakeAuthClient{
		loginErr: errors.New("invalid payload"),
	}
	useFakeAuthClient(t, fake)

	app := tview.NewApplication()
	var route string
	login := internalscreens.Login(app, func(name string) {
		route = name
	})

	form := formFromScreen(t, login)
	pressFormButton(t, form, 0)

	if route != "auth" {
		t.Fatalf("expected empty credential login edge path to route auth, got %q", route)
	}
	if fake.loginCalls != 1 {
		t.Fatalf("expected one login call in edge path, got %d", fake.loginCalls)
	}
}

func TestRegisterSuccessPersistsUserAndRoutesToChatMenu(t *testing.T) {
	setupScreenTestDB(t, true)
	fake := &fakeAuthClient{
		registerResult: internalservices.AuthSession{
			Username:     "register@example.com",
			AccessToken:  "register-access",
			RefreshToken: "register-refresh",
			UserID:       77,
		},
	}
	useFakeAuthClient(t, fake)

	var route string
	register := internalscreens.Register(func(name string) {
		route = name
	})
	form := formFromScreen(t, register)
	setFormInput(t, form, "Email", "register@example.com")
	setFormInput(t, form, "Password", "password")
	setFormInput(t, form, "Confirm password", "password")
	pressFormButton(t, form, 0)

	if route != "chatmenu" {
		t.Fatalf("expected successful register route to chatmenu, got %q", route)
	}
	if fake.registerCalls != 1 {
		t.Fatalf("expected one register API call, got %d", fake.registerCalls)
	}

	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}
	var user internalmodels.User
	if queryErr := dbu.Where("username = ?", "register@example.com").First(&user).Error; queryErr != nil {
		t.Fatalf("expected persisted registered user: %v", queryErr)
	}
	if user.Jwt != "register-access" || user.JwtRefresh != "register-refresh" {
		t.Fatalf("unexpected tokens for registered user: %q / %q", user.Jwt, user.JwtRefresh)
	}
}

func TestRegisterErrorRoutesToAuth(t *testing.T) {
	setupScreenTestDB(t, true)
	fake := &fakeAuthClient{
		registerErr: errors.New("username already in use"),
	}
	useFakeAuthClient(t, fake)

	var route string
	register := internalscreens.Register(func(name string) {
		route = name
	})
	form := formFromScreen(t, register)
	setFormInput(t, form, "Email", "dup@example.com")
	setFormInput(t, form, "Password", "password")
	setFormInput(t, form, "Confirm password", "password")
	pressFormButton(t, form, 0)

	if route != "auth" {
		t.Fatalf("expected register failure to route auth, got %q", route)
	}
}

func TestRegisterEdgeCaseMismatchedPasswordsRoutesToAuthWithoutAPICall(t *testing.T) {
	setupScreenTestDB(t, true)
	fake := &fakeAuthClient{}
	useFakeAuthClient(t, fake)

	var route string
	register := internalscreens.Register(func(name string) {
		route = name
	})
	form := formFromScreen(t, register)
	setFormInput(t, form, "Email", "edge@example.com")
	setFormInput(t, form, "Password", "password")
	setFormInput(t, form, "Confirm password", "different")
	pressFormButton(t, form, 0)

	if route != "auth" {
		t.Fatalf("expected mismatched-password edge path to route auth, got %q", route)
	}
	if fake.registerCalls != 0 {
		t.Fatalf("expected no register API calls for mismatched passwords, got %d", fake.registerCalls)
	}
}
