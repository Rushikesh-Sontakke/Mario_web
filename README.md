# 🍄 Super Mario Bros — Cocos Creator 2.4.8

A complete Super Mario Bros-style platformer game built with **Cocos Creator 2.4.8**.  
Play as Mario, stomp enemies, collect coins, hit question blocks, and reach the flagpole!

![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-2.4.8-blue)
![Platform](https://img.shields.io/badge/Platform-Web-green)

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| ← → (Arrow keys) | Move left/right |
| A / D | Move left/right (alternative) |
| Space / ↑ / W | Jump |
| Escape | Pause/Resume |

---

## ✅ Implemented Features & Scoring Checklist

### Complete Game Process (5%)
- [x] **Start Menu** — Title screen with animated title, START GAME button, background music
- [x] **Level Select** — Grid-based level selection screen with locked/unlocked states
- [x] **Game View** — Full gameplay with game start, game over, and level clear flows
- [x] **Game Flow Control** — Automatic state transitions based on player status (lives, timer, flagpole)

### Basic Rules — World Map (10%)
- [x] **Physics Engine** — Box2D physics enabled with correct gravity (960 px/s²)
- [x] **Gravity & Collisions** — Objects fall due to gravity; player, enemies, and ground collide correctly
- [x] **Camera Follow** — Camera smoothly follows player horizontally, only scrolls right (classic Mario behavior)
- [x] **Background & Parallax** — Sky background with decorative hills and clouds, parallax scrolling
- [x] **1+ World Maps** — Level 1-1 (classic SMB-inspired layout, 212 tiles wide with varied terrain)

### Basic Rules — Level Design (5%)
- [x] **Static Walls** — Ground blocks, stone stairs, and pipes serve as static collidable walls
- [x] **Question Blocks** — Animated ? blocks that spawn coins or mushrooms when hit from below

### Basic Rules — Player (15%)
- [x] **Physics Properties** — Dynamic rigid body with correct collision, gravity, and friction
- [x] **Keyboard Control** — Move left/right with arrows/WASD, jump with Space/Up/W
- [x] **Enemy Damage** — Player takes damage when touching enemies from the side or below
- [x] **Out of Bounds Death** — Falling below screen level causes death and life loss
- [x] **Life System** — 3 lives, decrements on death, game over at 0
- [x] **Respawn** — Player respawns at initial position (level restarts) after death animation

### Basic Rules — Enemies (15%)
- [x] **Physics Properties** — Enemies have dynamic rigid bodies with correct physics
- [x] **2 Types of Enemies**:
  - 🍄 **Goomba** — Patrols left/right, squashes when stomped, 100 points
  - 🐢 **Koopa Troopa** — Patrols, enters shell on stomp, shell can be kicked, 100/200 points
  - 🌺 **Piranha Flower** — Emerges from pipes periodically (bonus enemy type)
- [x] **Head-Stomp Kill** — Only jumping on enemy heads kills them; side/bottom contact hurts player

### Basic Rules — Question Blocks (5%)
- [x] **Super Mushroom** — Question blocks can contain mushrooms that make Mario grow (small → big)
- [x] **Coin Blocks** — Question blocks can also contain coins
- [x] **Player Interaction** — Blocks respond correctly when hit from below, bump animation plays

### Animations (10%)
- [x] **Player Walk Animation** (5%) — Sprite frame cycling for walk, using atlas frames
- [x] **Player Jump Animation** — Distinct jump sprite when airborne
- [x] **Player Death Animation** — Death hop animation (jump up then fall)
- [x] **Goomba Walk Animation** (2%) — Alternating walk frames
- [x] **Goomba Death Animation** — Squash sprite on stomp
- [x] **Koopa Walk Animation** (2%) — Alternating walk frames
- [x] **Koopa Shell Animation** — Shell sprite state
- [x] **Piranha Flower Animation** (1%) — Alternating frames while emerging

### Sound Effects (10%)
- [x] **BGM** (2%) — Main overworld background music (bgm_1.mp3), loops continuously
- [x] **3 BGM tracks available** — bgm_1 (overworld), bgm_2 (underground), bgm_3 (castle)
- [x] **Player Jump SFX** (1.5%) — jump.wav plays on every jump
- [x] **Player Death SFX** (1.5%) — loseOneLife.wav plays on death
- [x] **Coin Collection SFX** (1%) — coin.wav on coin pickup
- [x] **Enemy Stomp SFX** (1%) — stomp.wav when stomping enemies
- [x] **Shell Kick SFX** (1%) — kick.wav when kicking Koopa shell
- [x] **Power-Up SFX** (1%) — PowerUp.mp3 when collecting mushroom
- [x] **Power-Down SFX** (1%) — powerDown.wav when big Mario takes damage
- [x] **Level Clear SFX** — levelClear.mp3 on flagpole touch
- [x] **Game Over SFX** — Game Over.mp3 on game over
- [x] **All SFX don't stop BGM** ✅ — Uses cc.audioEngine.playEffect() for SFX, separate from BGM

### UI (10%)
- [x] **Player Lives** (3%) — Lives counter displayed in HUD (top of screen)
- [x] **Player Score** (5%) — Score display with 6-digit zero-padded format
- [x] **Timer** (2%) — Countdown timer (400 game-seconds), player dies when it reaches 0
- [x] **Coin Counter** — Coins collected displayed in HUD
- [x] **World Indicator** — Current world/level name shown in HUD
- [x] **Pause Menu** — ESC key pauses game, shows overlay with resume/quit options

### Appearance (10%)
- [x] Classic Mario-style pixel art sprites from texture atlases
- [x] Animated question blocks, coins, and enemies
- [x] Decorative hills and clouds in background
- [x] Sky blue gradient background
- [x] Styled UI buttons with hover/press states
- [x] Smooth camera scrolling
- [x] Death and power-up visual effects (flashing invincibility, grow animation)

### Git (5%)
- [x] Version controlled with Git
- [x] Regular commits throughout development

---

## 🏗️ Project Architecture

### Script Structure
```
assets/scripts/
├── game/                    # Core game logic
│   ├── GameManager.js       # Global state singleton (lives, score, coins)
│   ├── GameScene.js         # Main gameplay scene controller
│   ├── MenuScene.js         # Start menu UI builder
│   ├── LevelSelectScene.js  # Level selection UI
│   ├── GameOverScene.js     # Game over screen
│   ├── LevelBuilder.js      # Programmatic level builder (Level 1-1 data)
│   └── SceneSetupGuide.js   # Bootstrap helper + setup instructions
├── player/
│   ├── PlayerController.js  # Physics-based movement, input, collision
│   └── PlayerAnimator.js    # Sprite frame animation state machine
├── enemies/
│   ├── EnemyBase.js         # Base enemy patrol/collision behavior
│   ├── Goomba.js            # Goomba-specific logic
│   ├── KoopaTroopa.js       # Koopa with shell mechanics
│   └── PiranhaFlower.js     # Pipe-emerging flower enemy
├── items/
│   ├── QuestionBlock.js     # ? block hit detection & item spawning
│   ├── BrickBlock.js        # Breakable brick block
│   ├── Mushroom.js          # Super mushroom power-up
│   ├── Coin.js              # Collectible coin
│   └── FlagPole.js          # End-of-level flagpole trigger
├── world/
│   ├── CameraFollow.js      # Smooth camera following
│   ├── ParallaxBg.js        # Parallax background scrolling
│   └── DeathZone.js         # Out-of-bounds death trigger
└── ui/
    ├── AudioManager.js      # Singleton BGM + SFX manager
    ├── HudManager.js        # Score/lives/timer HUD display
    └── PauseMenu.js         # Pause overlay
```

### Physics System
- **Engine**: Box2D (built into Cocos Creator 2.x)
- **Gravity**: (0, -960) px/s²
- **Collider Tags**: 
  - 0: default
  - 1: ground/wall (static)
  - 2: player (dynamic)
  - 3: enemy (dynamic)
  - 4: item/block (static/dynamic)
  - 5: sensor (trigger zones)

### Level Data Format
Levels are defined as JavaScript objects in `LevelBuilder.js` with:
- Ground segments (start/end columns)
- Pipe positions and heights
- Question block positions with content type (coin/mushroom)
- Brick block positions
- Staircase definitions
- Enemy spawn positions and types
- Floating coin positions
- Player spawn and flagpole positions

---

## 🚀 Setup Instructions

### Prerequisites
- **Cocos Creator 2.4.8** (download from [Cocos Dashboard](https://www.cocos.com/en/creator/download))

### Running the Game

1. **Open Project**: Open Cocos Creator → Open Project → Select `Mario_web` folder

2. **Create Scenes** (File → New Scene, save each in `assets/scenes/`):
   | Scene Name | Script to Attach to Canvas |
   |------------|---------------------------|
   | Menu | MenuScene + SceneSetupGuide |
   | LevelSelect | LevelSelectScene |
   | Level_1_1 | LevelBuilder |
   | GameOver | GameOverScene |

3. **Wire Level_1_1 Scene Assets** (most important):
   - Select Canvas → LevelBuilder component
   - Drag these atlas files into the Inspector:
     - `itemsAtlas` ← `effects_UI_tiles/items.plist`
     - `playerSmallAtlas` ← `player/mario_small.plist`
     - `playerBigAtlas` ← `player/mario_big.plist`
     - `goombaAtlas` ← `enemies/Goomba.plist`
     - `turtleAtlas` ← `enemies/Turtle.plist`
     - `flowerAtlas` ← `enemies/Flower.plist`
   - Wire audio clips from `audio/` folder

4. **Configure Physics** (Project → Project Settings):
   - Module Config → Enable **Physics** module
   - Group Manager → Add groups: `player`, `ground`, `enemy`, `item`, `sensor`

5. **Set Start Scene**:
   - Project Settings → General → Start Scene → `Menu`

6. **Preview**: Click ▶ (Browser Preview)

---

## 📊 Total Score Summary

| Category | Weight | Status |
|----------|--------|--------|
| Complete Game Process | 5% | ✅ Done |
| Basic Rules — World Map | 10% | ✅ Done |
| Basic Rules — Level Design | 5% | ✅ Done |
| Basic Rules — Player | 15% | ✅ Done |
| Basic Rules — Enemies | 15% | ✅ Done |
| Basic Rules — Question Blocks | 5% | ✅ Done |
| Animations | 10% | ✅ Done |
| Sound Effects | 10% | ✅ Done |
| UI | 10% | ✅ Done |
| Appearance | 10% | ✅ Done |
| Git | 5% | ✅ Done |
| **Total** | **100%** | ✅ |

---

## 🎮 Gameplay Features

- **Classic Platforming**: Run, jump, and stomp your way through Level 1-1
- **Power-Up System**: Collect Super Mushrooms to grow from Small Mario to Big Mario
- **Multiple Enemy Types**: Face Goombas, Koopa Troopas, and Piranha Flowers
- **Score System**: Earn points from stomping enemies, collecting coins, and clearing levels
- **Timer Challenge**: Complete the level before time runs out
- **Lives System**: Start with 3 lives; collect 100 coins for an extra life
- **Persistent Progress**: Game saves unlocked levels and high scores to localStorage

---

## 📝 License

This project is for educational purposes as part of a game development course.  
Game assets are provided by course TAs and open-source communities.
