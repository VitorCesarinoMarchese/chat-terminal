package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Auth(app *tview.Application, switchScreen func(name string)) tview.Primitive {
	list := tview.NewList().
		AddItem("Login", "If you already have a account", 'l', nil).
		AddItem("Register", "If you are new to TUI-Chat", 'r', nil).
		AddItem("Quit", "Press to go back", 'q', func() {
			switchScreen("home")
		})
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
