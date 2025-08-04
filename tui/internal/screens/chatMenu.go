package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func ChatMenu(switchScreen func(name string)) tview.Primitive {
	list := tview.NewList().
		SetShortcutColor(tcell.ColorOrchid).
		AddItem("Contacts", "A list of all your contacts", 'c', func() {
			switchScreen("contacts")
		}).
		AddItem("Groups", "A list of all your groups", 'g', func() {
			switchScreen("groups")
		}).
		AddItem("Quit", "Press to go back", 'q', func() {
			switchScreen("home")
		})
	frame := tview.NewFrame(list).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat auth", true, tview.AlignCenter, tcell.ColorGreen)
	return frame

}
