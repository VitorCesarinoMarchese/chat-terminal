package screens

import (
	"github.com/rivo/tview"
)

func NewPages(app *tview.Application) *tview.Pages {
	pages := tview.NewPages()

	var switchScreens func(name string)
	refreshDynamicPage := func(name string) {
		switch name {
		case "contacts":
			pages.RemovePage("contacts")
			pages.AddPage("contacts", Contacts(switchScreens), true, false)
		case "groups":
			pages.RemovePage("groups")
			pages.AddPage("groups", Groups(switchScreens), true, false)
		case "conversation":
			pages.RemovePage("conversation")
			pages.AddPage("conversation", Conversation(switchScreens), true, false)
		}
	}

	switchScreens = func(name string) {
		refreshDynamicPage(name)
		pages.SwitchToPage(name)
	}

	pages.AddPage("home", Home(app, switchScreens), true, true)
	pages.AddPage("auth", Auth(switchScreens), true, false)
	pages.AddPage("login", Login(app, switchScreens), true, false)
	pages.AddPage("register", Register(switchScreens), true, false)
	pages.AddPage("chatmenu", ChatMenu(switchScreens), true, false)
	pages.AddPage("contacts", tview.NewBox(), true, false)
	pages.AddPage("groups", tview.NewBox(), true, false)
	pages.AddPage("conversation", tview.NewBox(), true, false)
	pages.AddPage("account", AccountMenu(switchScreens), true, false)
	pages.AddPage("username", UsernameChange(switchScreens), true, false)
	pages.AddPage("password", PaswordChange(switchScreens), true, false)
	pages.AddPage("test", Test(app), true, false)

	return pages
}
