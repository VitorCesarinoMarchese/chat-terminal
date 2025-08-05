package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func AccountMenu(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{"Username", "Change your username", 'u', func() {
			switchScreen("login")
		}},
		{"Password", "Change your password", 'p', func() {
			switchScreen("password")
		}},
		{"Quit", "Press to go back", 'q', func() {
			switchScreen("home")
		}},
	}
	list := widgets.Menu(items)

	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("Hi, tept o climb #31289", true, tview.AlignCenter, tcell.ColorGreen)
	return frame

}
