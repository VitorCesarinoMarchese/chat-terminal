package screens_test

import (
	"testing"

	internalscreens "github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	"github.com/rivo/tview"
)

func TestHomeMenuRoutesToExpectedPages(t *testing.T) {
	app := tview.NewApplication()
	var routes []string

	home := internalscreens.Home(app, func(name string) {
		routes = append(routes, name)
	})

	list := listFromScreen(t, home)
	if list.GetItemCount() != 4 {
		t.Fatalf("expected 4 home menu entries, got %d", list.GetItemCount())
	}

	if main, _ := list.GetItemText(0); main != "Auth" {
		t.Fatalf("expected first home item to be Auth, got %q", main)
	}

	if main, _ := list.GetItemText(1); main != "Chat" {
		t.Fatalf("expected second home item to be Chat, got %q", main)
	}

	if main, _ := list.GetItemText(3); main != "Test" {
		t.Fatalf("expected fourth home item to be Test, got %q", main)
	}

	list.GetItemSelectedFunc(0)()
	list.GetItemSelectedFunc(1)()
	list.GetItemSelectedFunc(3)()
	list.GetItemSelectedFunc(2)() // Quit should not panic.

	expected := []string{"auth", "chatmenu", "test"}
	if len(routes) != len(expected) {
		t.Fatalf("expected %d route events, got %d (%v)", len(expected), len(routes), routes)
	}
	for i := range expected {
		if routes[i] != expected[i] {
			t.Fatalf("expected route %d to be %q, got %q", i, expected[i], routes[i])
		}
	}
}

func TestAuthChatAndAccountMenusRouteAsExpected(t *testing.T) {
	var routes []string
	switchScreen := func(name string) {
		routes = append(routes, name)
	}

	authList := listFromScreen(t, internalscreens.Auth(switchScreen))
	chatList := listFromScreen(t, internalscreens.ChatMenu(switchScreen))
	accountList := listFromScreen(t, internalscreens.AccountMenu(switchScreen))

	if authList.GetItemCount() != 3 {
		t.Fatalf("expected 3 auth entries, got %d", authList.GetItemCount())
	}
	if chatList.GetItemCount() != 3 {
		t.Fatalf("expected 3 chat entries, got %d", chatList.GetItemCount())
	}
	if accountList.GetItemCount() != 3 {
		t.Fatalf("expected 3 account entries, got %d", accountList.GetItemCount())
	}

	authList.GetItemSelectedFunc(0)()
	authList.GetItemSelectedFunc(1)()
	authList.GetItemSelectedFunc(2)()

	chatList.GetItemSelectedFunc(0)()
	chatList.GetItemSelectedFunc(1)()
	chatList.GetItemSelectedFunc(2)()

	accountList.GetItemSelectedFunc(0)()
	accountList.GetItemSelectedFunc(1)()
	accountList.GetItemSelectedFunc(2)()

	expected := []string{
		"login", "register", "home",
		"contacts", "groups", "home",
		"login", "password", "home",
	}
	if len(routes) != len(expected) {
		t.Fatalf("expected %d route events, got %d (%v)", len(expected), len(routes), routes)
	}
	for i := range expected {
		if routes[i] != expected[i] {
			t.Fatalf("expected route %d to be %q, got %q", i, expected[i], routes[i])
		}
	}
}

func TestRegisterAndPasswordFormsExposeExpectedNavigation(t *testing.T) {
	useFakeAuthClient(t, &fakeAuthClient{})

	var routes []string
	switchScreen := func(name string) {
		routes = append(routes, name)
	}

	registerForm := formFromScreen(t, internalscreens.Register(switchScreen))
	passwordForm := formFromScreen(t, internalscreens.PaswordChange(switchScreen))

	pressFormButton(t, registerForm, 0) // Register
	pressFormButton(t, registerForm, 1) // Quit
	pressFormButton(t, passwordForm, 0) // Save
	pressFormButton(t, passwordForm, 1) // Quit

	expected := []string{"auth", "auth", "auth", "account"}
	if len(routes) != len(expected) {
		t.Fatalf("expected %d route events, got %d (%v)", len(expected), len(routes), routes)
	}
	for i := range expected {
		if routes[i] != expected[i] {
			t.Fatalf("expected route %d to be %q, got %q", i, expected[i], routes[i])
		}
	}
}

func TestPagesRegisterAllExpectedScreens(t *testing.T) {
	app := tview.NewApplication()
	pages := internalscreens.NewPages(app)

	expectedPages := []string{"home", "auth", "login", "register", "chatmenu", "account", "password", "test"}
	for _, page := range expectedPages {
		if !pages.HasPage(page) {
			t.Fatalf("expected pages to include %q", page)
		}
	}

	front, _ := pages.GetFrontPage()
	if front != "home" {
		t.Fatalf("expected default front page to be home, got %q", front)
	}
}
