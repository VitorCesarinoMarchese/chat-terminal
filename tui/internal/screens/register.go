package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Register(switchScreen func(name string)) tview.Primitive {
	form := tview.NewForm().
		SetFieldBackgroundColor(tcell.ColorDarkGreen).
		SetLabelColor(tcell.ColorOrchid).
		SetButtonBackgroundColor(tcell.ColorDarkGreen).
		AddInputField("Email", "", 0, nil, nil).
		AddPasswordField("Password", "", 0, '*', nil).
		AddPasswordField("Confirm password", "", 0, '*', nil).
		AddTextView("Pro tip", "You can navigate using tab and shift+tab", 0, 2, true, false).
		AddButton("Register", func() {
			switchScreen("auth")
		}).
		AddButton("Quit", func() {
			switchScreen("auth")
		}).
		SetButtonsAlign(tview.AlignCenter)
	flex := tview.NewFlex().AddItem(nil, 0, 1, false).
		AddItem(form, 40, 1, true).
		AddItem(nil, 0, 1, false)

	frame := tview.NewFrame(flex).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat register", true, tview.AlignCenter, tcell.ColorGreen)

	return frame

}
