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
	pages.AddPage("auth", screens.Auth(app, switchScreens), true, false)
	return pages
}
