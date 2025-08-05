package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func ChatMenu(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{"Contacts", "A list of all your contacts", 'c', func() {
			switchScreen("contacts")
		}},
		{"Groups", "A list of all your groups", 'g', func() {
			switchScreen("groups")
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
