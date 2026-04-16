package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type Chat struct {
	ID      int
	Name    string
	Members []string
}

type ChatSocket interface {
	Join(username string, token string, chatID int) error
	Send(username string, token string, text string) error
	Close() error
}

type ChatDialer interface {
	Dial(url string) (ChatSocket, error)
}

type ChatClient interface {
	ListFriends(username string, accessToken string) ([]string, error)
	ListChats(username string, accessToken string) ([]Chat, error)
	OpenDirectChat(username string, accessToken string, friendUsername string) (Chat, error)
	ConnectWebSocket() (ChatSocket, error)
}

type HTTPChatClient struct {
	baseURL string
	wsURL   string
	client  *http.Client
	dialer  ChatDialer
}

type chatResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    struct {
		UserChats      []chatPayload      `json:"userChats"`
		FriendRequests []friendshipRecord `json:"friendRequests"`
	} `json:"data"`
	UserChats      []chatPayload      `json:"userChats"`
	FriendRequests []friendshipRecord `json:"friendRequests"`
}

type chatErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type chatPayload struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Member []struct {
		User struct {
			Username string `json:"username"`
		} `json:"user"`
	} `json:"member"`
}

type friendshipRecord struct {
	Status   string `json:"status"`
	Receiver struct {
		Username string `json:"username"`
	} `json:"receiver"`
	Requester struct {
		Username string `json:"username"`
	} `json:"requester"`
}

type websocketDialer struct {
	dialer *websocket.Dialer
}

type websocketChatSocket struct {
	conn *websocket.Conn
}

func NewHTTPChatClient() *HTTPChatClient {
	baseURL := os.Getenv("TUI_API_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "http://localhost:8080"
	}

	wsURL := os.Getenv("TUI_WS_BASE_URL")
	if strings.TrimSpace(wsURL) == "" {
		wsURL = "ws://localhost:3030"
	}

	return NewHTTPChatClientWith(
		baseURL,
		wsURL,
		&http.Client{Timeout: 5 * time.Second},
		&websocketDialer{dialer: websocket.DefaultDialer},
	)
}

func NewHTTPChatClientWith(baseURL string, wsURL string, client *http.Client, dialer ChatDialer) *HTTPChatClient {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}
	if dialer == nil {
		dialer = &websocketDialer{dialer: websocket.DefaultDialer}
	}

	return &HTTPChatClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		wsURL:   strings.TrimRight(wsURL, "/"),
		client:  client,
		dialer:  dialer,
	}
}

func (c *HTTPChatClient) ListFriends(username string, accessToken string) ([]string, error) {
	values := url.Values{}
	values.Set("username", username)

	response, err := c.getJSON("/api/friend/list", values, accessToken)
	if err != nil {
		return nil, err
	}

	requests := response.Data.FriendRequests
	if len(requests) == 0 {
		requests = response.FriendRequests
	}

	seen := make(map[string]struct{})
	friends := make([]string, 0, len(requests))

	for _, request := range requests {
		if !strings.EqualFold(request.Status, "ACCEPTED") {
			continue
		}

		receiver := strings.TrimSpace(request.Receiver.Username)
		requester := strings.TrimSpace(request.Requester.Username)
		if receiver == "" || requester == "" {
			continue
		}

		counterpart := receiver
		if strings.EqualFold(receiver, username) {
			counterpart = requester
		}
		if strings.EqualFold(counterpart, username) {
			counterpart = receiver
		}
		if strings.EqualFold(counterpart, username) {
			continue
		}

		if _, exists := seen[counterpart]; exists {
			continue
		}
		seen[counterpart] = struct{}{}
		friends = append(friends, counterpart)
	}

	sort.Strings(friends)
	return friends, nil
}

func (c *HTTPChatClient) ListChats(username string, accessToken string) ([]Chat, error) {
	values := url.Values{}
	values.Set("username", username)

	response, err := c.getJSON("/api/chat/all", values, accessToken)
	if err != nil {
		return nil, err
	}

	return decodeChats(response)
}

func (c *HTTPChatClient) OpenDirectChat(username string, accessToken string, friendUsername string) (Chat, error) {
	friend := strings.TrimSpace(friendUsername)
	if friend == "" {
		return Chat{}, fmt.Errorf("friend username is required")
	}

	chats, err := c.getChatsWith(username, friend, accessToken)
	if err != nil {
		return Chat{}, err
	}
	if len(chats) > 0 {
		return chats[0], nil
	}

	if err := c.createChat(username, accessToken, directChatName(username, friend), []string{friend}); err != nil {
		return Chat{}, err
	}

	chats, err = c.getChatsWith(username, friend, accessToken)
	if err != nil {
		return Chat{}, err
	}
	if len(chats) == 0 {
		return Chat{}, fmt.Errorf("direct chat creation returned empty result")
	}

	return chats[0], nil
}

func (c *HTTPChatClient) ConnectWebSocket() (ChatSocket, error) {
	return c.dialer.Dial(c.wsURL)
}

func (c *HTTPChatClient) getChatsWith(username string, friendUsername string, accessToken string) ([]Chat, error) {
	values := url.Values{}
	values.Set("username", username)
	values.Set("findUser", friendUsername)

	response, err := c.getJSON("/api/chat/with", values, accessToken)
	if err != nil {
		return nil, err
	}
	return decodeChats(response)
}

func (c *HTTPChatClient) createChat(username string, accessToken string, name string, members []string) error {
	payload := struct {
		Name     string   `json:"name"`
		Username string   `json:"username"`
		Members  []string `json:"members"`
	}{
		Name:     name,
		Username: username,
		Members:  members,
	}

	_, err := c.postJSON("/api/chat/create", payload, accessToken)
	return err
}

func (c *HTTPChatClient) getJSON(path string, values url.Values, accessToken string) (chatResponse, error) {
	targetURL := c.baseURL + path
	if encoded := values.Encode(); encoded != "" {
		targetURL += "?" + encoded
	}

	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return chatResponse{}, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	return c.execute(req)
}

func (c *HTTPChatClient) postJSON(path string, payload any, accessToken string) (chatResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return chatResponse{}, err
	}

	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewBuffer(body))
	if err != nil {
		return chatResponse{}, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)
	return c.execute(req)
}

func (c *HTTPChatClient) execute(req *http.Request) (chatResponse, error) {
	resp, err := c.client.Do(req)
	if err != nil {
		return chatResponse{}, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return chatResponse{}, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var parsed chatErrorResponse
		_ = json.Unmarshal(raw, &parsed)

		message := strings.TrimSpace(parsed.Error)
		if message == "" {
			message = strings.TrimSpace(string(raw))
		}
		if message == "" {
			message = "request failed"
		}

		return chatResponse{}, &APIError{
			Status:  resp.StatusCode,
			Message: message,
		}
	}

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return chatResponse{}, err
	}
	if !parsed.Success {
		return chatResponse{}, fmt.Errorf("expected success response but got success=false")
	}

	return parsed, nil
}

func decodeChats(response chatResponse) ([]Chat, error) {
	payload := response.Data.UserChats
	if len(payload) == 0 {
		payload = response.UserChats
	}

	chats := make([]Chat, 0, len(payload))
	for _, item := range payload {
		if item.ID <= 0 {
			return nil, fmt.Errorf("chat response missing id")
		}

		chat := Chat{
			ID:      item.ID,
			Name:    item.Name,
			Members: make([]string, 0, len(item.Member)),
		}
		for _, member := range item.Member {
			name := strings.TrimSpace(member.User.Username)
			if name != "" {
				chat.Members = append(chat.Members, name)
			}
		}
		chats = append(chats, chat)
	}

	return chats, nil
}

func directChatName(left string, right string) string {
	names := []string{strings.TrimSpace(left), strings.TrimSpace(right)}
	sort.Strings(names)
	return fmt.Sprintf("dm-%s-%s", names[0], names[1])
}

func (d *websocketDialer) Dial(targetURL string) (ChatSocket, error) {
	conn, _, err := d.dialer.Dial(targetURL, nil)
	if err != nil {
		return nil, err
	}

	return &websocketChatSocket{conn: conn}, nil
}

func (s *websocketChatSocket) Join(username string, token string, chatID int) error {
	message := map[string]any{
		"type": "join",
		"payload": map[string]string{
			"username": username,
			"token":    token,
			"chatId":   strconv.Itoa(chatID),
		},
	}

	return s.conn.WriteJSON(message)
}

func (s *websocketChatSocket) Send(username string, token string, text string) error {
	message := map[string]any{
		"type": "chat",
		"payload": map[string]string{
			"username": username,
			"token":    token,
			"text":     text,
		},
	}

	return s.conn.WriteJSON(message)
}

func (s *websocketChatSocket) Close() error {
	return s.conn.Close()
}
