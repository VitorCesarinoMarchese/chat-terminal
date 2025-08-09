package screens

import (
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Test(app *tview.Application) tview.Primitive {
	messages := []string{
		"[green]User1: [white]Hey, how are you?",
		"[blue]User2: [white]I'm doing fine, thanks! You?",
		"[green]User1: [white]Pretty good. Just testing this widget.",
		"[blue]User2: [white]Looks like it's working!",
		"[green]User1: [white]Sweet! Let’s add some more messages...",
		"[blue]User2: [white]Sure thing!",
		"[green]User1: [white]Hey, how are you?",
		"[blue]User2: [white]I'm doing fine, thanks! You?",
		"[green]User1: [white]Pretty good. Just testing this widget.",
		"[blue]User2: [white]Looks like it's working!",
		"[green]User1: [white]Sweet! Let’s add some more messages...",
		"[blue]User2: [white]Sure thing!",
		"[green]User1: [white]Hey, how are you?",
		"[blue]User2: [white]I'm doing fine, thanks! You?",
		"[green]User1: [white]Pretty good. Just testing this widget.",
		"[blue]User2: [white]Looks like it's working!",
		"[green]User1: [white]Sweet! Let’s add some more messages...",
		"[blue]User2: [white]Sure thing!",
		"[green]User1: [white]Hey, how are you?",
		"[blue]User2: [white]I'm doing fine, thanks! You?",
		"[green]User1: [white]Pretty good. Just testing this widget.",
		"[blue]User2: [white]Looks like it's working!",
		"[green]User1: [white]Sweet! Let’s add some more messages...",
		"[blue]User2: [white]Sure thing!",
	}

	testSubject := widgets.Conversations(messages, app)
	input := tview.NewInputField().
		SetLabel("message: ").
		SetFieldBackgroundColor(tcell.ColorGreen).
		SetLabelColor(tcell.ColorOrchid)

	flex := tview.NewFlex().
		SetDirection(tview.FlexColumnCSS).
		AddItem(testSubject, 0, 19, false).
		AddItem(input, 0, 1, true)

	frame := tview.NewFrame(flex).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat", true, tview.AlignCenter, tcell.ColorGreen)

	return frame
}
