import process from "process";
import { Box, Text, useInput } from "ink"
import { useState } from "react";

export default function Menu() {
  const options = ["Auth", "Chat", "Exit"]
  const authOptions = ["Login", "Register"]
  const chatOptions = ["Send msg"]

  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState(false)
  const [menu, setMenu] = useState(options)


  const actions: Record<string, () => void> = {
    Exit: () => {
      console.clear();
      console.log("Exiting now");
      process.exit(0);
    },
    Auth: () => {
      setMenu(authOptions);
      setSelected(0);
    },
    Chat: () => {
      setMenu(chatOptions);
      setSelected(0);
    }
  };

  useInput((input, key) => {
    if (key.escape) setMode(!mode)
    if (!mode) {
      if (key.upArrow) setSelected((prev) => (prev - 1 + menu.length) % menu.length)
      if (key.downArrow) setSelected((prev) => (prev + 1) % menu.length)
    }

    if (key.rightArrow) {
      const current = menu[selected]
      const action = actions[current]
      if (action) action()
    }
    if (key.leftArrow) {
      setMenu(options)
    }
  })
  return (<>
    <Text color="green" bold italic>Wellcome to the tui-chat</Text>
    <Text color="green">You can move the arrow keys</Text>
    <Text color="green">(Hit esc to enable vim motions)</Text>

    <Text></Text>
    <Box flexDirection="column">
      {menu.map((opt, i) => (
        <Text key={opt} backgroundColor={i === selected ? "green" : ""} color={i === selected ? "white" : "green"}>
          {opt}
        </Text>
      )
      )}
    </Box>



  </>);
}
