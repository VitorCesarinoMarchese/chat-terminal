package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Test(app *tview.Application) tview.Primitive {
	messages := []string{
		"User1: Hey, how are you?",
		"User2: I'm doing fine, thanks! You?",
		"User1: Pretty good. Just testing this widget.",
		"User2: Looks like it's working!",
		"User1: Sweet! Let’s add some more messages...",
		"User2: Sure thing!",
	}

	testSubject := widgets.Conversations(messages, app)

	frame := tview.NewFrame(testSubject).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat", true, tview.AlignCenter, tcell.ColorGreen)

	return frame
}
