package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Auth(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{"Login", "If you already have a account", 'l', func() {
			switchScreen("login")
		}},
		{"Register", "If you are new to TUI-Chat", 'r', func() {
			switchScreen("register")
		}},
		{"Quit", "Press to go back", 'q', func() {
			switchScreen("home")
		}},
	}

	list := widgets.Menu(items)
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat auth", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
