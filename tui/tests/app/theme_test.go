package app_test

import (
	"testing"

	internalapp "github.com/VitorCesarinoMarchese/chat-terminal/internal/app"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func TestNewAppUsesTerminalDefaultGlobalTheme(t *testing.T) {
	original := tview.Styles
	t.Cleanup(func() {
		tview.Styles = original
	})

	_ = internalapp.NewApp()

	if tview.Styles.PrimitiveBackgroundColor != tcell.ColorDefault {
		t.Fatalf("expected primitive background color default, got %v", tview.Styles.PrimitiveBackgroundColor)
	}
	if tview.Styles.ContrastBackgroundColor != tcell.ColorDefault {
		t.Fatalf("expected contrast background color default, got %v", tview.Styles.ContrastBackgroundColor)
	}
	if tview.Styles.MoreContrastBackgroundColor != tcell.ColorDefault {
		t.Fatalf("expected more-contrast background color default, got %v", tview.Styles.MoreContrastBackgroundColor)
	}
	if tview.Styles.PrimaryTextColor != tcell.ColorDefault {
		t.Fatalf("expected primary text color default, got %v", tview.Styles.PrimaryTextColor)
	}
	if tview.Styles.SecondaryTextColor != tcell.ColorDefault {
		t.Fatalf("expected secondary text color default, got %v", tview.Styles.SecondaryTextColor)
	}
}
