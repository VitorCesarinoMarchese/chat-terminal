package screens_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func readScreenSource(t *testing.T, file string) string {
	t.Helper()

	path := filepath.Join("..", "..", "internal", "screens", file)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed reading %s: %v", path, err)
	}

	return string(content)
}

func TestFormScreensUseSharedTerminalThemeHelper(t *testing.T) {
	files := []string{"login.go", "register.go", "password.go", "username.go", "conversation.go"}

	for _, file := range files {
		content := readScreenSource(t, file)
		if !strings.Contains(content, "applyTerminalFormTheme(") {
			t.Fatalf("expected %s to use applyTerminalFormTheme helper", file)
		}
		if strings.Contains(content, "ColorDarkGreen") || strings.Contains(content, "ColorOrchid") {
			t.Fatalf("expected %s to avoid hardcoded form colors", file)
		}
	}
}

func TestConversationScreenAvoidsInlineStyleTags(t *testing.T) {
	content := readScreenSource(t, "conversation.go")
	if strings.Contains(content, "[red]") || strings.Contains(content, "[green]") || strings.Contains(content, "[yellow]") {
		t.Fatalf("expected conversation screen to avoid inline style tags")
	}
}

func TestThemeHelperDefinesButtonHighlightStyle(t *testing.T) {
	content := readScreenSource(t, "theme.go")
	if !strings.Contains(content, "SetButtonActivatedStyle(") {
		t.Fatalf("expected theme helper to set activated button style")
	}
	if !strings.Contains(content, "buttonHighlightColor") {
		t.Fatalf("expected activated button style to use highlight color constant")
	}
}
