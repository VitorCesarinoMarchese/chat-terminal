package screens

import (
	"log"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/app"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/models"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func loginState(switchScreen func(name string)) {
	dbu := app.GetDB()
	if dbu == nil || dbu.DB == nil {
		log.Fatal("Database not initilazed")
		return
	}

	user := models.User{
		Username:   "tep",
		Jwt:        "test",
		JwtRefresh: "test",
	}

	res := dbu.DB.WithContext(dbu.Ctx).Create(&user)
	if res.Error != nil {
		switchScreen("auth")
		return
	}

	switchScreen("chat")

}

func Login(app *tview.Application, switchScreen func(name string)) tview.Primitive {
	form := tview.NewForm().
		SetFieldBackgroundColor(tcell.ColorDarkGreen).
		SetLabelColor(tcell.ColorOrchid).
		SetButtonBackgroundColor(tcell.ColorDarkGreen).
		AddInputField("Email", "", 0, nil, nil).
		AddPasswordField("Password", "", 0, '*', nil).
		AddTextView("Pro tip", "You can navigate using tab and shift+tab", 0, 2, true, false).
		AddButton("Login", func() {
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
		AddText("TUI-Chat login", true, tview.AlignCenter, tcell.ColorGreen)

	return frame
}
