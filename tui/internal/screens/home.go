package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Home(app *tview.Application, switchScreen func(name string)) tview.Primitive {
	items := []types.MenuItem{
		{Title: "Auth", Desc: "Login/Register", Shortcut: 'a', F: func() {
			switchScreen("auth")
		}},
		{Title: "Chat", Desc: "Chat with friends", Shortcut: 'c', F: func() {
			switchScreen("chatmenu")
		}},
		{Title: "Quit", Desc: "Press to exit", Shortcut: 'q', F: func() {
			app.Stop()
		}},
	}
	list := widgets.Menu(items)
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
