package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Contacts(switchScreen func(name string)) tview.Primitive {
	items := make([]types.MenuItem, 0)

	session, err := currentSession()
	if err == nil {
		friends, listErr := chatClient.ListFriends(session.Username, session.AccessToken)
		if listErr == nil {
			for _, friend := range friends {
				friendName := friend
				items = append(items, types.MenuItem{
					Title: friendName,
					Desc:  "Open direct chat",
					F: func() {
						openDirectConversation(friendName, switchScreen)
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
		AddText("TUI-Chat contacts", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
