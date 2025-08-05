package app

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	"github.com/rivo/tview"
)

func NewPages(app *tview.Application) *tview.Pages {
	pages := tview.NewPages()

	switchScreens := func(name string) {
		pages.SwitchToPage(name)
	}

	pages.AddPage("home", screens.Home(app, switchScreens), true, true)
	pages.AddPage("auth", screens.Auth(switchScreens), true, false)
	pages.AddPage("login", screens.Login(app, switchScreens), true, false)
	pages.AddPage("register", screens.Register(switchScreens), true, false)
	pages.AddPage("chatmenu", screens.ChatMenu(switchScreens), true, false)
	pages.AddPage("account", screens.AccountMenu(switchScreens), true, false)
	pages.AddPage("password", screens.PaswordChange(switchScreens), true, false)

	return pages
}
