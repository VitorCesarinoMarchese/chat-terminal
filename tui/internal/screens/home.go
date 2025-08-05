package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Home(app *tview.Application, switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{"Auth", "Login/Register", 'a', func() {
			switchScreen("auth")
		}},
		{"Chat", "Chat with friends", 'c', func() {
			switchScreen("chatmenu")
		}},
		{"Quit", "Press to exit", 'q', func() {
			app.Stop()
		}},
	}
	list := widgets.Menu(items)
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
