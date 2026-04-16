package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func registerState(
	email string,
	password string,
	confirmPassword string,
	switchScreen func(name string),
) {
	if email == "" || password == "" || confirmPassword == "" {
		switchScreen("auth")
		return
	}
	if password != confirmPassword {
		switchScreen("auth")
		return
	}

	session, err := authClient.Register(email, password)
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

func Register(switchScreen func(name string)) tview.Primitive {
	email, password, confirmPassword := "", "", ""

	form := tview.NewForm().
		SetFieldBackgroundColor(tcell.ColorDarkGreen).
		SetLabelColor(tcell.ColorOrchid).
		SetButtonBackgroundColor(tcell.ColorDarkGreen).
		AddInputField("Email", "", 0, nil, func(value string) {
			email = value
		}).
		AddPasswordField("Password", "", 0, '*', func(value string) {
			password = value
		}).
		AddPasswordField("Confirm password", "", 0, '*', func(value string) {
			confirmPassword = value
		}).
		AddTextView("Pro tip", "You can navigate using tab and shift+tab", 0, 2, true, false).
		AddButton("Register", func() {
			registerState(email, password, confirmPassword, switchScreen)
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
