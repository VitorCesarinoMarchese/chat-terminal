package screens_test

import (
	"path/filepath"
	"testing"

	internaldb "github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	internalmodels "github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
	internalscreens "github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	internalservices "github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func setupScreenTestDB(t *testing.T, withMigrations bool) {
	t.Helper()

	path := filepath.Join(t.TempDir(), "state.db")
	t.Setenv("TUI_DB_PATH", path)
	internaldb.InitDB()
	if withMigrations {
		internalmodels.InitMigrations()
	}

	t.Cleanup(func() {
		_ = internaldb.CloseDB()
		internalscreens.ResetAuthClientForTests()
	})
}

type fakeAuthClient struct {
	loginResult    internalservices.AuthSession
	loginErr       error
	registerResult internalservices.AuthSession
	registerErr    error
	loginCalls     int
	registerCalls  int
}

func (f *fakeAuthClient) Login(username string, password string) (internalservices.AuthSession, error) {
	f.loginCalls++
	return f.loginResult, f.loginErr
}

func (f *fakeAuthClient) Register(username string, password string) (internalservices.AuthSession, error) {
	f.registerCalls++
	return f.registerResult, f.registerErr
}

func (f *fakeAuthClient) ValidateAccessToken(token string, refreshToken string, userID int) (string, error) {
	return token, nil
}

func useFakeAuthClient(t *testing.T, client internalservices.AuthClient) {
	t.Helper()
	internalscreens.SetAuthClientForTests(client)
	t.Cleanup(func() {
		internalscreens.ResetAuthClientForTests()
	})
}

func frameFromPrimitive(t *testing.T, primitive tview.Primitive) *tview.Frame {
	t.Helper()

	frame, ok := primitive.(*tview.Frame)
	if !ok {
		t.Fatalf("expected *tview.Frame, got %T", primitive)
	}

	return frame
}

func listFromScreen(t *testing.T, primitive tview.Primitive) *tview.List {
	t.Helper()

	frame := frameFromPrimitive(t, primitive)
	list, ok := frame.GetPrimitive().(*tview.List)
	if !ok {
		t.Fatalf("expected frame primitive to be *tview.List, got %T", frame.GetPrimitive())
	}

	return list
}

func formFromScreen(t *testing.T, primitive tview.Primitive) *tview.Form {
	t.Helper()

	frame := frameFromPrimitive(t, primitive)
	flex, ok := frame.GetPrimitive().(*tview.Flex)
	if !ok {
		t.Fatalf("expected frame primitive to be *tview.Flex, got %T", frame.GetPrimitive())
	}

	formPrimitive := flex.GetItem(1)
	form, ok := formPrimitive.(*tview.Form)
	if !ok {
		t.Fatalf("expected second flex item to be *tview.Form, got %T", formPrimitive)
	}

	return form
}

func setFormInput(t *testing.T, form *tview.Form, label, value string) {
	t.Helper()

	item := form.GetFormItemByLabel(label)
	if item == nil {
		t.Fatalf("missing form field with label %q", label)
	}

	input, ok := item.(*tview.InputField)
	if !ok {
		t.Fatalf("expected form field %q to be *tview.InputField, got %T", label, item)
	}

	input.SetText(value)
}

func pressFormButton(t *testing.T, form *tview.Form, index int) {
	t.Helper()

	button := form.GetButton(index)
	if button == nil {
		t.Fatalf("missing form button at index %d", index)
	}

	handler := button.InputHandler()
	if handler == nil {
		t.Fatalf("button at index %d has nil input handler", index)
	}

	handler(tcell.NewEventKey(tcell.KeyEnter, 0, tcell.ModNone), func(p tview.Primitive) {})
}
