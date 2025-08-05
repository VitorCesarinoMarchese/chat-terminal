package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func AccountMenu(switchScreen func(name string)) tview.Primitive {
	list := tview.NewList().
		SetShortcutColor(tcell.ColorOrchid).
		AddItem("Username", "Change your username", 'u', func() {
			switchScreen("login")
		}).
		AddItem("Password", "Change your password", 'p', func() {
			switchScreen("password")
		}).
		AddItem("Quit", "Press to go back", 'q', func() {
			switchScreen("home")
		})
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("Hi, tept o climb #31289", true, tview.AlignCenter, tcell.ColorGreen)
	return frame

}
