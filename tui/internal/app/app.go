package app

import (
	"github.com/rivo/tview"
)

type App struct {
	tviewApp *tview.Application
}

func NewApp() *App {
	app := tview.NewApplication()
	pages := NewPages(app)

	app.SetRoot(pages, true)
	app.SetFocus(pages)

	return &App{tviewApp: app}
}

func (a *App) Run() error {
	return a.tviewApp.Run()
}
