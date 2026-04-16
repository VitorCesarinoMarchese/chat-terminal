package screens

import (
	"errors"
	"fmt"
	"strings"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/db"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
	"gorm.io/gorm"
)

type persistedSession struct {
	Username     string
	AccessToken  string
	RefreshToken string
}

type activeConversation struct {
	chatName    string
	chatID      int
	username    string
	accessToken string
	returnPage  string
	socket      services.ChatSocket
}

var chatClient services.ChatClient = services.NewHTTPChatClient()
var currentConversation activeConversation

func SetChatClientForTests(client services.ChatClient) {
	if client == nil {
		ResetChatClientForTests()
		return
	}

	chatClient = client
}

func ResetChatClientForTests() {
	closeActiveConversation()
	chatClient = services.NewHTTPChatClient()
}

func currentSession() (persistedSession, error) {
	dbu, err := db.GetDB()
	if err != nil {
		return persistedSession{}, err
	}

	var user models.User
	result := dbu.Order("updated_at DESC").First(&user)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return persistedSession{}, fmt.Errorf("session not found")
	}
	if result.Error != nil {
		return persistedSession{}, result.Error
	}

	if strings.TrimSpace(user.Username) == "" || strings.TrimSpace(user.Jwt) == "" {
		return persistedSession{}, fmt.Errorf("session is incomplete")
	}

	return persistedSession{
		Username:     user.Username,
		AccessToken:  user.Jwt,
		RefreshToken: user.JwtRefresh,
	}, nil
}

func setActiveConversation(
	chat services.Chat,
	session persistedSession,
	returnPage string,
	socket services.ChatSocket,
) {
	closeActiveConversation()
	currentConversation = activeConversation{
		chatName:    chat.Name,
		chatID:      chat.ID,
		username:    session.Username,
		accessToken: session.AccessToken,
		returnPage:  returnPage,
		socket:      socket,
	}
}

func getActiveConversation() (activeConversation, bool) {
	if currentConversation.socket == nil {
		return activeConversation{}, false
	}
	return currentConversation, true
}

func closeActiveConversation() {
	if currentConversation.socket != nil {
		_ = currentConversation.socket.Close()
	}
	currentConversation = activeConversation{}
}

func openDirectConversation(friendUsername string, switchScreen func(name string)) {
	session, err := currentSession()
	if err != nil {
		switchScreen("chatmenu")
		return
	}

	chat, err := chatClient.OpenDirectChat(session.Username, session.AccessToken, friendUsername)
	if err != nil {
		switchScreen("chatmenu")
		return
	}

	openConversation(chat, session, "contacts", switchScreen)
}

func openGroupConversation(chat services.Chat, switchScreen func(name string)) {
	session, err := currentSession()
	if err != nil {
		switchScreen("chatmenu")
		return
	}

	openConversation(chat, session, "groups", switchScreen)
}

func openConversation(chat services.Chat, session persistedSession, returnPage string, switchScreen func(name string)) {
	socket, err := chatClient.ConnectWebSocket()
	if err != nil {
		switchScreen("chatmenu")
		return
	}

	if err := socket.Join(session.Username, session.AccessToken, chat.ID); err != nil {
		_ = socket.Close()
		switchScreen("chatmenu")
		return
	}

	setActiveConversation(chat, session, returnPage, socket)
	switchScreen("conversation")
}
