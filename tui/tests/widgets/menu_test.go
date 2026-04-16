package widgets_test

import (
	"testing"

	"github.com/VitorCesarinoMarchese/chat-terminal/internal/types"
	"github.com/VitorCesarinoMarchese/chat-terminal/internal/widgets"
	"github.com/rivo/tview"
)

func listFromPrimitive(t *testing.T, primitive tview.Primitive) *tview.List {
	t.Helper()

	list, ok := primitive.(*tview.List)
	if !ok {
		t.Fatalf("expected *tview.List, got %T", primitive)
	}

	return list
}

func TestMenuBuildsItemsAndSelectionCallbacks(t *testing.T) {
	var selected string
	items := []types.MenuItem{
		{Title: "First", Desc: "first action", Shortcut: 'f', F: func() { selected = "first" }},
		{Title: "Second", Desc: "second action", Shortcut: 's', F: func() { selected = "second" }},
	}

	list := listFromPrimitive(t, widgets.Menu(items))
	if list.GetItemCount() != 2 {
		t.Fatalf("expected 2 menu items, got %d", list.GetItemCount())
	}

	main, secondary := list.GetItemText(1)
	if main != "Second" || secondary != "second action" {
		t.Fatalf("unexpected list text at index 1: %q / %q", main, secondary)
	}

	list.GetItemSelectedFunc(1)()
	if selected != "second" {
		t.Fatalf("expected selected callback to set 'second', got %q", selected)
	}
}

func TestMenuHandlesEmptyAndNilCallbacks(t *testing.T) {
	empty := listFromPrimitive(t, widgets.Menu(nil))
	if empty.GetItemCount() != 0 {
		t.Fatalf("expected no items for empty menu, got %d", empty.GetItemCount())
	}

	items := []types.MenuItem{
		{Title: "Noop", Desc: "nil callback", Shortcut: 'n', F: nil},
	}

	list := listFromPrimitive(t, widgets.Menu(items))
	if list.GetItemCount() != 1 {
		t.Fatalf("expected one item for nil callback case, got %d", list.GetItemCount())
	}

	if list.GetItemSelectedFunc(0) != nil {
		t.Fatalf("expected nil selected callback when menu callback is nil")
	}
}

