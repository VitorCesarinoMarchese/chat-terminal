package screens

import (
	"github.com/rivo/tview"
)

func NewPages(app *tview.Application) *tview.Pages {
	pages := tview.NewPages()

	switchScreens := func(name string) {
		pages.SwitchToPage(name)
	}

	pages.AddPage("home", Home(app, switchScreens), true, true)
	pages.AddPage("auth", Auth(switchScreens), true, false)
	pages.AddPage("login", Login(app, switchScreens), true, false)
	pages.AddPage("register", Register(switchScreens), true, false)
	pages.AddPage("chatmenu", ChatMenu(switchScreens), true, false)
	pages.AddPage("account", AccountMenu(switchScreens), true, false)
	pages.AddPage("password", PaswordChange(switchScreens), true, false)

	return pages
}
