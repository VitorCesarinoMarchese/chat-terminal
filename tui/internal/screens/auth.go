package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Auth(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{Title: "Login", Desc: "If you already have a account", Shortcut: 'l', F: func() {
			switchScreen("login")
		}},
		{Title: "Register", Desc: "If you are new to TUI-Chat", Shortcut: 'r', F: func() {
			switchScreen("register")
		}},
		{Title: "Quit", Desc: "Press to go back", Shortcut: 'q', F: func() {
			switchScreen("home")
		}},
	}

	list := widgets.Menu(items)
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat auth", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
