package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func AccountMenu(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{Title: "Username", Desc: "Change your username", Shortcut: 'u', F: func() {
			switchScreen("login")
		}},
		{Title: "Password", Desc: "Change your password", Shortcut: 'p', F: func() {
			switchScreen("password")
		}},
		{Title: "Quit", Desc: "Press to go back", Shortcut: 'q', F: func() {
			switchScreen("home")
		}},
	}
	list := widgets.Menu(items)

	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("Hi, tept o climb #31289", true, tview.AlignCenter, tcell.ColorGreen)
	return frame

}
