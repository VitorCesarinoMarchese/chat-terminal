package screens

import (
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

const (
	terminalBackgroundColor = tcell.ColorDefault
	terminalTextColor       = tcell.ColorDefault
	buttonHighlightColor    = tcell.ColorOrchid
	buttonHighlightText     = tcell.ColorBlack
)

func applyTerminalFormTheme(form *tview.Form) *tview.Form {
	defaultStyle := tcell.StyleDefault.
		Foreground(terminalTextColor).
		Background(terminalBackgroundColor)
	activatedButtonStyle := tcell.StyleDefault.
		Foreground(buttonHighlightText).
		Background(buttonHighlightColor).
		Bold(true)

	return form.
		SetFieldStyle(defaultStyle).
		SetFieldBackgroundColor(terminalBackgroundColor).
		SetFieldTextColor(terminalTextColor).
		SetLabelColor(terminalTextColor).
		SetButtonStyle(defaultStyle).
		SetButtonActivatedStyle(activatedButtonStyle).
		SetButtonBackgroundColor(terminalBackgroundColor).
		SetButtonTextColor(terminalTextColor)
}
