# chat-terminal

## Idea

Create a chat application for the terminal, using Go for the TUI and (whatever Guillermo wants) for the backend.

## State Management

After the user logs in, the JWT tokens are stored along with their username and # in a SQLite database, which in the future can also be used as some form of cache (for example, instead of the user requesting the whole conversation every time they enter it, they would only request new messages).

## Login

The user sends a request with their email and password, and if everything is correct, they receive a JWT and a refreshJWT to stay logged in. If they do not access the app for 14 days, the refreshJWT expires, and at the top of the screen something like “========= tept =========” will appear.

## Registration

The user creates an email, username, and password, and receives the same JWTs as in the login if everything works correctly. Also, next to their username, a # will appear, which will be the identifier used to add friends.

## Features

- **Realtime chat**
  Use WebSockets for communication between back and front end.
- **Group chats**
  Create a join table? Think more about it.
- **Audio message support**
  Research how to do this. Future feature.
- **Send files?**
  Research how to do this. Future feature.
- **Image support (profile pic and messages)**
  Apparently, tview supports images; how we’re going to send them is another story.
- **Friend list**
  Create a join table? Think more about it.

## Menu

- **Home**
  - Account
    - Login
    - Register
  - Account _Post-login_
    - Username
    - Password
    - Quit
  - Chat
    - Contacts
      - Add contact
      - List of contacts
    - Groups
      - Add groups
      - List of groups
    - Quit
  - Quit
