package app

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	"github.com/rivo/tview"
)

type App struct {
	tviewApp *tview.Application
}

func NewApp() *App {
	app := tview.NewApplication()
	pages := screens.NewPages(app)

	app.SetRoot(pages, true)
	app.SetFocus(pages)

	return &App{tviewApp: app}
}

func (a *App) Run() error {
	return a.tviewApp.Run()
}
