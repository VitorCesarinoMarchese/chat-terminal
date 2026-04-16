package services_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	internalservices "github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
)

type fakeDialer struct {
	socket  internalservices.ChatSocket
	err     error
	calls   int
	lastURL string
}

func (f *fakeDialer) Dial(url string) (internalservices.ChatSocket, error) {
	f.calls++
	f.lastURL = url
	if f.err != nil {
		return nil, f.err
	}
	return f.socket, nil
}

func TestListChatsSuccessParsesIDsAndMembers(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/api/chat/all" {
			http.NotFound(w, r)
			return
		}
		if r.URL.Query().Get("username") != "alice" {
			t.Fatalf("expected username query alice, got %q", r.URL.Query().Get("username"))
		}
		if got := r.Header.Get("Authorization"); got != "Bearer token-1" {
			t.Fatalf("expected bearer auth header, got %q", got)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"success": true,
			"message": "ok",
			"data": {
				"userChats": [
					{
						"id": 7,
						"name": "general",
						"member": [
							{ "user": { "username": "alice" } },
							{ "user": { "username": "bob" } }
						]
					}
				]
			}
		}`))
	}))
	defer server.Close()

	client := internalservices.NewHTTPChatClientWith(server.URL, "ws://localhost:3030", server.Client(), &fakeDialer{})
	chats, err := client.ListChats("alice", "token-1")
	if err != nil {
		t.Fatalf("expected list chats success, got error: %v", err)
	}
	if len(chats) != 1 {
		t.Fatalf("expected one chat, got %d", len(chats))
	}
	if chats[0].ID != 7 || chats[0].Name != "general" {
		t.Fatalf("unexpected chat payload: %#v", chats[0])
	}
	if strings.Join(chats[0].Members, ",") != "alice,bob" {
		t.Fatalf("expected members alice,bob, got %v", chats[0].Members)
	}
}

func TestListFriendsSuccessFiltersAcceptedCounterparts(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/api/friend/list" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"success": true,
			"message": "ok",
			"data": {
				"friendRequests": [
					{
						"id": 1,
						"status": "ACCEPTED",
						"receiver": { "username": "alice" },
						"requester": { "username": "bob" }
					},
					{
						"id": 2,
						"status": "PENDING",
						"receiver": { "username": "alice" },
						"requester": { "username": "charlie" }
					},
					{
						"id": 3,
						"status": "ACCEPTED",
						"receiver": { "username": "dana" },
						"requester": { "username": "alice" }
					}
				]
			}
		}`))
	}))
	defer server.Close()

	client := internalservices.NewHTTPChatClientWith(server.URL, "ws://localhost:3030", server.Client(), &fakeDialer{})
	friends, err := client.ListFriends("alice", "token-1")
	if err != nil {
		t.Fatalf("expected list friends success, got error: %v", err)
	}
	if strings.Join(friends, ",") != "bob,dana" {
		t.Fatalf("expected accepted counterparts bob,dana, got %v", friends)
	}
}

func TestOpenDirectChatCreatesWhenNoExistingChat(t *testing.T) {
	var withCalls int
	var createCalls int

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/api/chat/with":
			withCalls++
			w.Header().Set("Content-Type", "application/json")
			if withCalls == 1 {
				_, _ = w.Write([]byte(`{"success": true, "message": "ok", "data": {"userChats": []}}`))
				return
			}
			_, _ = w.Write([]byte(`{"success": true, "message": "ok", "data": {"userChats": [{"id": 44, "name": "dm-alice-bob", "member": []}]}}`))
		case r.Method == http.MethodPost && r.URL.Path == "/api/chat/create":
			createCalls++
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"success": true, "message": "created", "data": {}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := internalservices.NewHTTPChatClientWith(server.URL, "ws://localhost:3030", server.Client(), &fakeDialer{})
	chat, err := client.OpenDirectChat("alice", "token-1", "bob")
	if err != nil {
		t.Fatalf("expected direct chat open success, got error: %v", err)
	}
	if chat.ID != 44 || chat.Name != "dm-alice-bob" {
		t.Fatalf("unexpected direct chat payload: %#v", chat)
	}
	if withCalls != 2 {
		t.Fatalf("expected chat/with to be called twice, got %d", withCalls)
	}
	if createCalls != 1 {
		t.Fatalf("expected chat/create to be called once, got %d", createCalls)
	}
}

func TestListChatsReturnsAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"success":false,"error":"Access denied"}`))
	}))
	defer server.Close()

	client := internalservices.NewHTTPChatClientWith(server.URL, "ws://localhost:3030", server.Client(), &fakeDialer{})
	if _, err := client.ListChats("alice", "bad-token"); err == nil {
		t.Fatalf("expected list chats unauthorized error")
	}
}

func TestConnectWebSocketDialFailureEdgeCase(t *testing.T) {
	dialer := &fakeDialer{err: fmt.Errorf("dial failed")}
	client := internalservices.NewHTTPChatClientWith("http://localhost:8080", "ws://localhost:3030", &http.Client{}, dialer)
	if _, err := client.ConnectWebSocket(); err == nil {
		t.Fatalf("expected websocket dial failure to return error")
	}
	if dialer.calls != 1 || dialer.lastURL != "ws://localhost:3030" {
		t.Fatalf("expected one websocket dial to ws://localhost:3030, got calls=%d url=%q", dialer.calls, dialer.lastURL)
	}
}
