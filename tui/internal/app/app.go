package app

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/screens"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

type App struct {
	tviewApp *tview.Application
}

func NewApp() *App {
	applyTerminalGlobalTheme()
	app := tview.NewApplication()
	pages := screens.NewPages(app)

	app.SetRoot(pages, true)
	app.SetFocus(pages)

	return &App{tviewApp: app}
}

func applyTerminalGlobalTheme() {
	tview.Styles.PrimitiveBackgroundColor = tcell.ColorDefault
	tview.Styles.ContrastBackgroundColor = tcell.ColorDefault
	tview.Styles.MoreContrastBackgroundColor = tcell.ColorDefault
	tview.Styles.PrimaryTextColor = tcell.ColorDefault
	tview.Styles.SecondaryTextColor = tcell.ColorDefault
}

func (a *App) Run() error {
	return a.tviewApp.Run()
}
