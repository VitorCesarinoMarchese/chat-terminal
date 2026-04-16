package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Groups(switchScreen func(name string)) tview.Primitive {
	items := make([]types.MenuItem, 0)

	session, err := currentSession()
	if err == nil {
		chats, listErr := chatClient.ListChats(session.Username, session.AccessToken)
		if listErr == nil {
			for _, chat := range chats {
				chatEntry := chat
				items = append(items, types.MenuItem{
					Title: chatEntry.Name,
					Desc:  "Join group chat",
					F: func() {
						openGroupConversation(chatEntry, switchScreen)
					},
				})
			}
		}
	}

	items = append(items, types.MenuItem{
		Title:    "Back",
		Desc:     "Press to return to chat menu",
		Shortcut: 'q',
		F: func() {
			switchScreen("chatmenu")
		},
	})

	list := widgets.Menu(items)

	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat groups", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
