# OGS Plus

This is a Chrome extension program that makes using OGS (Online-Go.com) more convenient. It is not listed on the Chrome Web Store; instead, it is installed manually via the **"Load unpacked"** option in `chrome://extensions` (Developer mode).

## Installation Instructions
1. click Code
2.Download zip
3. Go to `chrome://extensions`
4. Turn on "Developer mode" in the top right corner
5. Click "Load unpacked"
6. Select the `src/` folder from this repository

## How to Use

After installation, go to **online-go.com → click your profile in the top-right corner → Settings**; you will see a new **"Plus Settings"** tab at the bottom of the existing settings list (General, Sound, Game, etc.). You can enable or disable all features within this tab (`/settings/plus`).

## Key Features

| Function | Description |
|---|---|
🌐 Multilingual | Switch the extension UI to 9 languages (Korean/Japanese/Chinese/Spanish/French/German/Russian/Portuguese) including English |
🎙️ Voice Input Explanation | After placing a move on the demo board, hold **Ctrl+Alt** to have it be recognized by your chosen language and filled into the chat input. Actual transmission is recorded only when **Enter** is pressed |
🖼️ Image Link Preview | Displays a secure inline preview to prevent users from clicking on image links in game chats or DMs (risk of spam or hacking) |
→ Custom stylesheets | Write CSS without manually adding `<link>` tags to About → Beta preview 🎨 Accepting automatically inserts a `<style>` block in About |
🔠 About heading shortcuts | While editing, press **Alt+H → 1–5 to automatically insert the Markdown heading (H1–H5) for the current level at the cursor position |
⚡ Beta Link | Added a 'Beta' button to the top navigation bar, which takes you to the beta.online-go.com version of the current page |
📊 Profile Win Rate Widget | Aggregate all match records on the user profile page and display them as a win rate card |
|→ SGF match upload | Added 'OGS Game' button to the SGF library page 🎮 Upload SGF directly by selecting your own match or someone else's match |
🤖 Bot Ranking Tournament Application Helper | Since many AI bots do not accept tournaments automatically, guidance and a direct link are provided to manually apply in the bot profile |
🔔 Unified notifications + desktop alerts for announcements, forum replies, and DMs. When there are too many DMs, block only DM notifications in Silent Mode |
🎛️ Toggle all functions individually; you can also turn the entire display off at once using the master switch |
## Project Structure

```
```
src/
├── manifest.json              # Manifest V3 정의
├── background/background.js   # 알림 처리용 service worker
├-- content/ # Content scripts injected into the OGS page
│ ├-- utils.js Common DOM/Settings/Translation Helper
│ ├-- notice.js Toast Notification UI
│   ├── settings-tab.Inject the JS "Plus Settings" tab (core UI)
│ ├-- voice-commentary.js Ctrl+Alt voice commentary → Enter chat
│ ├-- image-preview.js Chat/DM Image Link Preview
│ ├-- custom-css.js Custom CSS Beta Preview & About Auto-Post
│ ├-- about-heading.js Alt+H+1~5 Heading Shortcuts
│ ├-- beta-link.js Top Bar Beta Links
│ ├-- profile-stats.js Profile Win Rate Widget
│ ├-- sgf-upload.js SGF 'OGS Game' Upload Modal
│ ├-- bot-rank-request.js Bot Ranking Request Helper
│ ├-- notifications-watcher.js Notices/Forum/DM Detection → Notifications
│ └-- main.js Orchestrator (Load Settings / Subscribe)
├── lib/
│   ├── browser-polyfill.js    chrome.storage Promise 래퍼
│ └-- storage.js configuration schema + default values + save
├-- i18n/translations.js 9-Language Translation Dictionary
├-- popup / Toolbar Popup (Direct link to Plus Settings)
├-- options/ Extension Options Page (For Guidance)
└ -- icons/ Extension Icons
```

## Implementation Basis

This extension uses OGS's open-source frontend ([online-go/https://github.com/online-go/online-go.com))Ġ](online-go.com
By examining the source code, I configured selectors and API calls based on the existing DOM class names and API endpoints.
(예: `.Settings`/`#SettingsGroupSelector`, `.chat-line`/`.ChatLine`, `textarea.about-editor`,
`players/{id}/game_history/`, `games/{id}/sgf`, `me/games/sgf/{collection_id}`, `beta.online-go.com` 등)

## Precautions

- Use MutationObserver and the `history.pushState` hook to handle SPA (Single Page Application) routing.
- The "Accept" custom CSS feature actually calls the API (`PUT players/{id}`) to modify the user's About profile text. To turn it back on, toggle it off again in Plus Settings or edit the About section manually.
- Voice recognition uses the browser's built-in Web Speech API and does not send voice data to a separate server (according to the browser's STT implementation).
