### 1. basic set up

**VS Code** (or any editor): https://code.visualstudio.com

**Node.js**: https://nodejs.org (grab the LTS version)

**pnpm** (package manager):
```bash
npm install -g pnpm
```

**Homebrew** (macOS package manager): https://brew.sh
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install yt-dlp and ffmpeg


```bash
brew install yt-dlp ffmpeg
```

### 3. Clone and run

```bash
git clone https://github.com/DBdany/aquatube.git
cd aquatube
pnpm install
pnpm dev
```

Open http://localhost:3000

### 4. Use it

1. Paste a YouTube URL
2. Pick MP4 or MP3
3. Pick quality (for video)
4. Hit Convert
5. File downloads to your browser

 
