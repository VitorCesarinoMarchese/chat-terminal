package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Home(app *tview.Application, switchScreen func(name string)) tview.Primitive {
	list := tview.NewList().
		SetShortcutColor(tcell.ColorOrchid).
		AddItem("Auth", "Login/Register", 'a', func() {
			switchScreen("auth")
		}).
		AddItem("Chat", "Chat with friends", 'c', func() {
			switchScreen("chatmenu")
		}).
		AddItem("Quit", "Press to exit", 'q', func() {
			app.Stop()
		})
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
