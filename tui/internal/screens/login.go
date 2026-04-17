package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func loginState(email string, password string, switchScreen func(name string)) {
	session, err := authClient.Login(email, password)
	if err != nil {
		switchScreen("auth")
		return
	}

	if err := persistAuthSession(session); err != nil {
		switchScreen("auth")
		return
	}

	switchScreen("chatmenu")
}

func Login(app *tview.Application, switchScreen func(name string)) tview.Primitive {
	email, password := "", ""

	form := applyTerminalFormTheme(tview.NewForm()).
		AddInputField("Email", "", 0, nil, func(e string) {
			email = e
		}).
		AddPasswordField("Password", "", 0, '*', func(e string) {
			password = e
		}).
		AddTextView("Pro tip", "You can navigate using tab and shift+tab", 0, 2, true, false).
		AddButton("Login", func() {
			loginState(email, password, switchScreen)
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
		AddText("TUI-Chat login", true, tview.AlignCenter, tcell.ColorGreen)

	return frame
}
