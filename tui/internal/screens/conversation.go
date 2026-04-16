package screens

import (
	"fmt"
	"strings"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func Conversation(switchScreen func(name string)) tview.Primitive {
	state, ok := getActiveConversation()
	if !ok {
		list := widgets.Menu([]types.MenuItem{
			{
				Title:    "Back",
				Desc:     "Press to return to chat menu",
				Shortcut: 'q',
				F: func() {
					switchScreen("chatmenu")
				},
			},
		})

		return tview.NewFrame(list).
			SetBorders(2, 2, 2, 2, 4, 4).
			AddText("TUI-Chat conversation", true, tview.AlignCenter, tcell.ColorGreen)
	}

	textView := tview.NewTextView().
		SetDynamicColors(false)
	textView.SetText(fmt.Sprintf("Connected to %s\n", state.chatName))

	message := ""
	form := applyTerminalFormTheme(tview.NewForm())
	form.
		AddInputField("Message", "", 0, nil, func(value string) {
			message = value
		}).
		AddButton("Send", func() {
			trimmed := strings.TrimSpace(message)
			if trimmed == "" {
				return
			}
			if err := state.socket.Send(state.username, state.accessToken, trimmed); err != nil {
				fmt.Fprintf(textView, "send failed: %s\n", err.Error())
				return
			}

			fmt.Fprintf(textView, "you: %s\n", trimmed)
			message = ""
			field := form.GetFormItemByLabel("Message")
			if input, ok := field.(*tview.InputField); ok {
				input.SetText("")
			}
		}).
		AddButton("Quit", func() {
			returnPage := state.returnPage
			closeActiveConversation()
			switchScreen(returnPage)
		}).
		SetButtonsAlign(tview.AlignCenter)

	layout := tview.NewFlex().
		SetDirection(tview.FlexRow).
		AddItem(textView, 0, 3, false).
		AddItem(form, 7, 1, true)

	return tview.NewFrame(layout).
		SetBorders(2, 2, 2, 2, 4, 4).
		AddText("TUI-Chat conversation", true, tview.AlignCenter, tcell.ColorGreen)
}
