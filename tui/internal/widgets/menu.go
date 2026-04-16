package widgets

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Menu(items []types.MenuItem) tview.Primitive {
	list := tview.NewList().
		SetMainTextColor(tcell.ColorDefault).
		SetSecondaryTextColor(tcell.ColorDefault).
		SetShortcutColor(tcell.ColorOrchid)
	list.SetBackgroundColor(tcell.ColorDefault)

	for _, item := range items {
		list.AddItem(item.Title, item.Desc, item.Shortcut, item.F)
	}

	return list
}
