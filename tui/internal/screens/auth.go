package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Auth(switchScreen func(name string)) tview.Primitive {
	list := tview.NewList().
		SetShortcutColor(tcell.ColorOrchid).
		AddItem("Login", "If you already have a account", 'l', func() {
			switchScreen("login")
		}).
		AddItem("Register", "If you are new to TUI-Chat", 'r', func() {
			switchScreen("register")
		}).
		AddItem("Quit", "Press to go back", 'q', func() {
			switchScreen("home")
		})
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat auth", true, tview.AlignCenter, tcell.ColorGreen)
	return frame
}
