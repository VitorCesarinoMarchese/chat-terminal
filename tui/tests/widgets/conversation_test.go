package widgets_test

import (
	"strings"
	"testing"
	"time"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/rivo/tview"
)

func textViewFromPrimitive(t *testing.T, primitive tview.Primitive) *tview.TextView {
	t.Helper()

	view, ok := primitive.(*tview.TextView)
	if !ok {
		t.Fatalf("expected *tview.TextView, got %T", primitive)
	}

	return view
}

func waitForText(t *testing.T, view *tview.TextView, expected string) {
	t.Helper()

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		text := view.GetText(false)
		if strings.Contains(text, expected) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("timed out waiting for text %q in conversation view", expected)
}

func TestConversationsRendersMessages(t *testing.T) {
	app := tview.NewApplication()
	messages := []string{"hello", "world"}

	view := textViewFromPrimitive(t, widgets.Conversations(messages, app))
	waitForText(t, view, "world")

	got := view.GetText(false)
	for _, msg := range messages {
		if !strings.Contains(got, msg) {
			t.Fatalf("expected conversation text to contain %q, got %q", msg, got)
		}
	}
}

func TestConversationsHandlesEmptyMessages(t *testing.T) {
	app := tview.NewApplication()
	view := textViewFromPrimitive(t, widgets.Conversations(nil, app))

	time.Sleep(20 * time.Millisecond)
	if got := strings.TrimSpace(view.GetText(false)); got != "" {
		t.Fatalf("expected empty conversation view for nil messages, got %q", got)
	}
}

