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
		internalscreens.ResetChatClientForTests()
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
		internalscreens.ResetChatClientForTests()
	})
}

type fakeChatSocket struct {
	joinCalls  int
	sendCalls  int
	closeCalls int

	lastJoinUsername string
	lastJoinToken    string
	lastJoinChatID   int
	lastSendUsername string
	lastSendToken    string
	lastSendText     string

	joinErr  error
	sendErr  error
	closeErr error
}

func (f *fakeChatSocket) Join(username string, token string, chatID int) error {
	f.joinCalls++
	f.lastJoinUsername = username
	f.lastJoinToken = token
	f.lastJoinChatID = chatID
	return f.joinErr
}

func (f *fakeChatSocket) Send(username string, token string, text string) error {
	f.sendCalls++
	f.lastSendUsername = username
	f.lastSendToken = token
	f.lastSendText = text
	return f.sendErr
}

func (f *fakeChatSocket) Close() error {
	f.closeCalls++
	return f.closeErr
}

type fakeChatClient struct {
	listFriendsResult []string
	listFriendsErr    error
	listChatsResult   []internalservices.Chat
	listChatsErr      error
	openChatResult    internalservices.Chat
	openChatErr       error
	socket            internalservices.ChatSocket
	connectErr        error

	listFriendsCalls int
	listChatsCalls   int
	openChatCalls    int
	connectCalls     int
}

func (f *fakeChatClient) ListFriends(username string, accessToken string) ([]string, error) {
	f.listFriendsCalls++
	return f.listFriendsResult, f.listFriendsErr
}

func (f *fakeChatClient) ListChats(username string, accessToken string) ([]internalservices.Chat, error) {
	f.listChatsCalls++
	return f.listChatsResult, f.listChatsErr
}

func (f *fakeChatClient) OpenDirectChat(username string, accessToken string, friendUsername string) (internalservices.Chat, error) {
	f.openChatCalls++
	return f.openChatResult, f.openChatErr
}

func (f *fakeChatClient) ConnectWebSocket() (internalservices.ChatSocket, error) {
	f.connectCalls++
	if f.connectErr != nil {
		return nil, f.connectErr
	}
	return f.socket, nil
}

func useFakeChatClient(t *testing.T, client internalservices.ChatClient) {
	t.Helper()
	internalscreens.SetChatClientForTests(client)
	t.Cleanup(func() {
		internalscreens.ResetChatClientForTests()
	})
}

func seedSessionUser(t *testing.T, username string, accessToken string, refreshToken string) {
	t.Helper()
	dbu, err := internaldb.GetDB()
	if err != nil {
		t.Fatalf("GetDB() failed: %v", err)
	}

	user := internalmodels.User{
		Username:   username,
		Jwt:        accessToken,
		JwtRefresh: refreshToken,
	}
	if createErr := dbu.Create(&user).Error; createErr != nil {
		t.Fatalf("failed creating seeded session user: %v", createErr)
	}
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
