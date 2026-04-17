package screens_test

import (
	"errors"
	"strings"
	"testing"

	internalscreens "github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	internalservices "github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
	"github.com/rivo/tview"
)

func TestWorkflowContactsToConversationSendAndBack(t *testing.T) {
	setupScreenTestDB(t, true)
	seedSessionUser(t, "alice@example.com", "access-token", "refresh-token")

	socket := &fakeChatSocket{}
	chat := &fakeChatClient{
		listFriendsResult: []string{"bob@example.com"},
		openChatResult: internalservices.Chat{
			ID:   22,
			Name: "dm-alice-bob",
		},
		socket: socket,
	}
	useFakeChatClient(t, chat)

	app := tview.NewApplication()
	pages := internalscreens.NewPages(app)

	_, primitive := pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(1)() // Home -> Chat menu

	front, primitive := pages.GetFrontPage()
	if front != "chatmenu" {
		t.Fatalf("expected chatmenu page, got %q", front)
	}
	listFromScreen(t, primitive).GetItemSelectedFunc(0)() // Chat menu -> Contacts

	front, primitive = pages.GetFrontPage()
	if front != "contacts" {
		t.Fatalf("expected contacts page, got %q", front)
	}
	contacts := listFromScreen(t, primitive)
	if contacts.GetItemCount() != 2 {
		t.Fatalf("expected one contact + back entry, got %d", contacts.GetItemCount())
	}
	contacts.GetItemSelectedFunc(0)() // Contacts -> Conversation

	front, primitive = pages.GetFrontPage()
	if front != "conversation" {
		t.Fatalf("expected conversation page after opening contact, got %q", front)
	}
	form := formFromScreen(t, primitive)
	conversationView := conversationTextViewFromScreen(t, primitive)
	setFormInput(t, form, "Message", "hello bob")
	pressFormButton(t, form, 0) // Send

	if chat.listFriendsCalls != 1 {
		t.Fatalf("expected one friends list API call, got %d", chat.listFriendsCalls)
	}
	if chat.openChatCalls != 1 {
		t.Fatalf("expected one open direct chat API call, got %d", chat.openChatCalls)
	}
	if chat.connectCalls != 1 {
		t.Fatalf("expected one websocket connect call, got %d", chat.connectCalls)
	}
	if socket.joinCalls != 1 || socket.lastJoinChatID != 22 {
		t.Fatalf("expected one websocket join for chat id 22, got calls=%d id=%d", socket.joinCalls, socket.lastJoinChatID)
	}
	if socket.sendCalls != 1 || socket.lastSendText != "hello bob" {
		t.Fatalf("expected websocket send with message payload, got calls=%d text=%q", socket.sendCalls, socket.lastSendText)
	}
	if text := conversationView.GetText(false); strings.Contains(text, "[") {
		t.Fatalf("expected conversation view text without style tags, got %q", text)
	}

	pressFormButton(t, form, 1) // Quit
	front, _ = pages.GetFrontPage()
	if front != "contacts" {
		t.Fatalf("expected quit from conversation to return contacts, got %q", front)
	}
	if socket.closeCalls != 1 {
		t.Fatalf("expected websocket close on quit, got %d", socket.closeCalls)
	}
}

func TestContactOpenErrorRoutesToChatMenu(t *testing.T) {
	setupScreenTestDB(t, true)
	seedSessionUser(t, "alice@example.com", "access-token", "refresh-token")

	chat := &fakeChatClient{
		listFriendsResult: []string{"bob@example.com"},
		openChatErr:       errors.New("open chat failed"),
	}
	useFakeChatClient(t, chat)

	app := tview.NewApplication()
	pages := internalscreens.NewPages(app)

	_, primitive := pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(1)() // Home -> Chat menu
	_, primitive = pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(0)() // Chat menu -> Contacts

	_, primitive = pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(0)() // Contact select (failure path)

	front, _ := pages.GetFrontPage()
	if front != "chatmenu" {
		t.Fatalf("expected contact open failure to route to chatmenu, got %q", front)
	}
}

func TestGroupsEdgeCaseEmptyListExposesBackEntry(t *testing.T) {
	setupScreenTestDB(t, true)
	seedSessionUser(t, "alice@example.com", "access-token", "refresh-token")

	chat := &fakeChatClient{
		listChatsResult: []internalservices.Chat{},
	}
	useFakeChatClient(t, chat)

	app := tview.NewApplication()
	pages := internalscreens.NewPages(app)

	_, primitive := pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(1)() // Home -> Chat menu
	_, primitive = pages.GetFrontPage()
	listFromScreen(t, primitive).GetItemSelectedFunc(1)() // Chat menu -> Groups

	front, primitive := pages.GetFrontPage()
	if front != "groups" {
		t.Fatalf("expected groups page, got %q", front)
	}
	groups := listFromScreen(t, primitive)
	if groups.GetItemCount() != 1 {
		t.Fatalf("expected only back entry for empty groups list, got %d", groups.GetItemCount())
	}
	groups.GetItemSelectedFunc(0)()

	front, _ = pages.GetFrontPage()
	if front != "chatmenu" {
		t.Fatalf("expected back entry to route to chatmenu, got %q", front)
	}
}
