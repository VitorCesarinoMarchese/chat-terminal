package widgets

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Conversations(messages []string, app *tview.Application) tview.Primitive {

	msgView := tview.NewTextView().
		SetDynamicColors(true).
		SetRegions(true).
		SetChangedFunc(func() {
			app.Draw()
		})

	go func() {
		for _, msg := range messages {
			fmt.Fprintf(msgView, "%s \n", msg)
		}
	}()

	msgView.SetBorder(true).
		SetBorderColor(tcell.ColorWhite).
		SetBorderPadding(1, 1, 3, 3)

	return msgView
}
