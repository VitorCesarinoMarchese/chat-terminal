package types

type MenuItem struct {
	Title    string
	Desc     string
	Shortcut rune
	F        func()
}
