// GameManager.js
// Singleton global game state manager — persists across scenes via cc.game.addPersistRootNode.
// Access from anywhere: window.GameManager

cc.Class({
    extends: cc.Component,

    properties: {
        /** Player lives remaining */
        lives: {
            default: 3,
            type: cc.Integer,
            tooltip: 'Starting number of lives',
        },

        /** Accumulated score */
        score: {
            default: 0,
            type: cc.Integer,
        },

        /** Coins collected (resets at 100) */
        coins: {
            default: 0,
            type: cc.Integer,
        },

        /** Current level identifier, e.g. '1-1' */
        currentLevel: {
            default: '1-1',
            tooltip: 'Current level name',
        },

        /** Player power-up state: small | big | fire */
        playerState: {
            default: 'small',
            tooltip: 'small / big / fire',
        },

        /** Levels the player has unlocked */
        unlockedLevels: {
            default: [],
            type: [cc.String],
            tooltip: 'List of unlocked level names',
        },
    },

    // ───────────────────────────── Lifecycle ─────────────────────────────

    onLoad () {
        // ---------- Singleton guard ----------
        if (window.GameManager && window.GameManager !== this) {
            this.node.destroy();
            return;
        }

        window.GameManager = this;
        cc.game.addPersistRootNode(this.node);

        // Ensure the default level is always present
        if (this.unlockedLevels.length === 0) {
            this.unlockedLevels = ['1-1'];
        }

        // Restore saved progress (if any)
        this.loadProgress();
    },

    // ───────────────────────────── Score ─────────────────────────────────

    /**
     * Add points to the player's score.
     * @param {number} points — positive integer to add
     */
    addScore (points) {
        this.score += points;
    },

    // ───────────────────────────── Coins ─────────────────────────────────

    /**
     * Collect one coin.  Every 100 coins awards an extra life and resets
     * the coin counter.
     */
    addCoin () {
        this.coins += 1;

        if (this.coins >= 100) {
            this.coins = 0;
            this.lives += 1;
            cc.log('[GameManager] 100 coins! Extra life awarded. Lives: ' + this.lives);

            // Play 1-UP sound if AudioManager is available
            if (window.AudioManager) {
                window.AudioManager.playSFX('sfxReserve');
            }
        }
    },

    // ───────────────────────────── Lives ─────────────────────────────────

    /**
     * Lose one life.  When lives reach 0, trigger game over.
     */
    loseLife () {
        this.lives -= 1;
        cc.log('[GameManager] Life lost. Lives remaining: ' + this.lives);

        if (this.lives <= 0) {
            this.gameOver();
        }
    },

    // ───────────────────────────── Game Over ─────────────────────────────

    /**
     * Transition to the GameOver scene.
     */
    gameOver () {
        cc.log('[GameManager] GAME OVER');

        if (window.AudioManager) {
            window.AudioManager.stopBGM();
            window.AudioManager.playSFX('sfxGameOver');
        }

        // Small delay so the game-over jingle can be heard
        this.scheduleOnce(function () {
            cc.director.loadScene('GameOver');
        }, 2.0);
    },

    // ───────────────────────────── Level Clear ──────────────────────────

    /**
     * Called when the player finishes a level.
     * Unlocks the next level and returns to LevelSelect.
     */
    levelClear () {
        cc.log('[GameManager] Level ' + this.currentLevel + ' cleared!');

        if (window.AudioManager) {
            window.AudioManager.stopBGM();
            window.AudioManager.playSFX('sfxLevelClear');
        }

        // Determine the next level name (e.g. '1-1' → '1-2', '1-4' → '2-1')
        var nextLevel = this._getNextLevel(this.currentLevel);

        if (nextLevel && this.unlockedLevels.indexOf(nextLevel) === -1) {
            this.unlockedLevels.push(nextLevel);
            cc.log('[GameManager] Unlocked level: ' + nextLevel);
        }

        this.saveProgress();

        // Navigate to level-select after a short fanfare delay
        this.scheduleOnce(function () {
            cc.director.loadScene('LevelSelect');
        }, 3.0);
    },

    /**
     * Internal helper — derive the next level string from the current one.
     * Supports the classic 'W-S' naming convention (world-stage).
     * @param {string} level — e.g. '1-1'
     * @returns {string|null}
     */
    _getNextLevel (level) {
        var parts = level.split('-');
        if (parts.length !== 2) return null;

        var world = parseInt(parts[0], 10);
        var stage = parseInt(parts[1], 10);

        if (isNaN(world) || isNaN(stage)) return null;

        // 4 stages per world, then advance to the next world
        if (stage < 4) {
            return world + '-' + (stage + 1);
        } else {
            return (world + 1) + '-1';
        }
    },

    // ───────────────────────────── Reset ─────────────────────────────────

    /**
     * Reset every piece of game state back to its defaults.
     */
    resetGame () {
        this.lives        = 3;
        this.score        = 0;
        this.coins        = 0;
        this.currentLevel = '1-1';
        this.playerState  = 'small';
        this.unlockedLevels = ['1-1'];
        cc.log('[GameManager] Game state reset');
    },

    // ───────────────────────────── Navigation ───────────────────────────

    /**
     * Jump to a specific level scene.
     * @param {string} levelName — e.g. '1-1'
     */
    goToLevel (levelName) {
        this.currentLevel = levelName;
        this.playerState  = 'small';   // player always starts small
        cc.log('[GameManager] Going to level: ' + levelName);
        cc.director.loadScene(levelName);
    },

    // ───────────────────────── Persistence ───────────────────────────────

    /**
     * Serialise essential state to localStorage.
     */
    saveProgress () {
        var data = {
            lives:          this.lives,
            score:          this.score,
            coins:          this.coins,
            currentLevel:   this.currentLevel,
            playerState:    this.playerState,
            unlockedLevels: this.unlockedLevels,
        };
        cc.sys.localStorage.setItem('mario_save', JSON.stringify(data));
        cc.log('[GameManager] Progress saved');
    },

    /**
     * Restore state from localStorage (if a save exists).
     */
    loadProgress () {
        var raw = cc.sys.localStorage.getItem('mario_save');
        if (!raw) {
            cc.log('[GameManager] No saved progress found');
            return;
        }

        try {
            var data = JSON.parse(raw);
            this.lives          = data.lives          !== undefined ? data.lives          : 3;
            this.score          = data.score          !== undefined ? data.score          : 0;
            this.coins          = data.coins          !== undefined ? data.coins          : 0;
            this.currentLevel   = data.currentLevel   || '1-1';
            this.playerState    = data.playerState    || 'small';
            this.unlockedLevels = data.unlockedLevels || ['1-1'];
            cc.log('[GameManager] Progress loaded');
        } catch (e) {
            cc.warn('[GameManager] Failed to parse save data: ' + e.message);
        }
    },
});
