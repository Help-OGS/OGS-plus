# OGS Plus

This is a Chrome extension that makes OGS (Online-Go.com) more convenient to use. It is not listed on the Chrome Web Store; install it manually using the **Load unpacked** option on `chrome://extensions` while Developer mode is enabled.

## Installation

1. Click **Realease** and download the ZIP archive.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `src/` folder from this repository.

## How to Use

After installation, open **online-go.com → your profile (top right) → Settings**. The **Plus Settings** tab appears at the bottom of the settings list. Use it to configure the extension's features (available at `/settings/plus`).

## Key Features

| Feature | Description |
|---|---|
| 🌐 Multilingual UI | Switch the extension UI between nine languages: English, Korean, Japanese, Chinese, Spanish, French, German, Russian, and Portuguese. |
| 🎙️ Voice input | On the demo board, hold **Ctrl+Alt** to dictate a comment in your selected language into the chat input. The comment is sent only when you press **Enter**. |
| 🖼️ Image link preview | Show secure inline previews for image links in game chats and direct messages. |
| 🎨 Custom stylesheets | Preview custom CSS and optionally add it to your About profile. |
| 🔠 About heading shortcuts | Press **Alt+H**, then **1–5**, while editing to insert a Markdown heading. |
| ⚡ Beta link | Open the beta version of the current page from a button in the top navigation bar. |
| 📊 Profile win-rate widget | Display a win-rate summary based on the match records on a user's profile. |
| 🎮 SGF match upload | Upload an SGF from the SGF library by selecting your own match or another player's match. |
| 🤖 Bot tournament helper | Find guidance and a direct link for manually applying to bot tournaments. |
| 🔔 Notifications | Receive notifications and desktop alerts for announcements, forum replies, and direct messages. Silent Mode can suppress direct-message notifications. |
| 🎛️ Feature controls | Toggle features individually or switch off the entire extension display. |


## Implementation Basis

This extension builds on OGS's open-source frontend: [online-go/online-go.com](https://github.com/online-go/online-go.com). Its selectors and API calls are based on the existing DOM class names and API endpoints, including `.Settings`, `#SettingsGroupSelector`, `.chat-line`, `.ChatLine`, `textarea.about-editor`, `players/{id}/game_history/`, `games/{id}/sgf`, `me/games/sgf/{collection_id}`, and `beta.online-go.com`.

## Precautions

- The extension uses `MutationObserver` and a `history.pushState` hook to handle single-page application (SPA) navigation.
- The custom CSS **Accept** feature calls `PUT players/{id}` to update the About profile text. To remove the inserted text, disable the feature in Plus Settings or edit the About section manually.
- Voice recognition uses the browser's built-in Web Speech API. Voice data is not sent to a separate server by this extension; handling depends on the browser's speech-to-text implementation.
