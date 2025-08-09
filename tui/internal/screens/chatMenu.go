package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func ChatMenu(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{Title: "Contacts", Desc: "A list of all your contacts", Shortcut: 'c', F: func() {
			switchScreen("contacts")
		}},
		{Title: "Groups", Desc: "A list of all your groups", Shortcut: 'g', F: func() {
			switchScreen("groups")
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
