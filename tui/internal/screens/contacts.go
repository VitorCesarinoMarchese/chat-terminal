package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Contacts(switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{Title: "Back", Desc: "Press to return to chat menu", Shortcut: 'q', F: func() {
			switchScreen("chatmenu")
		}},
	}
	list := widgets.Menu(items)

	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat contacts", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
