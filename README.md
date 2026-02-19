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

### Voila

 
