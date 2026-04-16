package widgets_test

import (
	"testing"
	"time"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func TestConversationsUsesTerminalDefaultBorderColor(t *testing.T) {
	app := tview.NewApplication()
	view := textViewFromPrimitive(t, widgets.Conversations([]string{"hello"}, app))

	time.Sleep(20 * time.Millisecond)
	if got := view.GetBorderColor(); got != tcell.ColorDefault {
		t.Fatalf("expected conversation border color to use terminal default, got %v", got)
	}
}
