// HudManager.js
// In-game HUD overlay — displays score, coins, lives, world, and countdown timer.
// Attach to a persistent UI Canvas node that sits on top of the gameplay scene.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Label showing the player's score */
        scoreLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'Label node for score display',
        },

        /** Label showing collected coins */
        coinsLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'Label node for coins display',
        },

        /** Label showing remaining lives */
        livesLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'Label node for lives display',
        },

        /** Label showing the current world / level name */
        worldLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'Label node for world name display',
        },

        /** Label showing the countdown timer */
        timerLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'Label node for timer display',
        },

        /** Optional icon next to the lives counter */
        lifeIcon: {
            default: null,
            type: cc.Node,
            tooltip: 'Sprite node for the life icon',
        },

        /** Optional icon next to the timer */
        timerIcon: {
            default: null,
            type: cc.Node,
            tooltip: 'Sprite node for the timer icon',
        },
    },

    // ───────────────────────────── Lifecycle ─────────────────────────────

    onLoad () {
        /** Seconds remaining on the level timer */
        this.timeRemaining = 400;

        // Kick off the one-second countdown
        this.schedule(this.updateTimer, 1.0);

        // Immediately refresh the display with current values
        this._refreshAll();
    },

    /**
     * Called every frame — keeps the HUD labels in sync with GameManager.
     */
    update (dt) {
        this._refreshAll();
    },

    // ───────────────────────── Display Updates ───────────────────────────

    /**
     * Set the score label text.
     * @param {number} score
     */
    updateScore (score) {
        if (this.scoreLabel) {
            // Zero-pad to 6 digits for the classic look
            this.scoreLabel.string = this._zeroPad(score, 6);
        }
    },

    /**
     * Set the coins label text.
     * @param {number} coins
     */
    updateCoins (coins) {
        if (this.coinsLabel) {
            this.coinsLabel.string = 'x' + this._zeroPad(coins, 2);
        }
    },

    /**
     * Set the lives label text.
     * @param {number} lives
     */
    updateLives (lives) {
        if (this.livesLabel) {
            this.livesLabel.string = 'x' + lives;
        }
    },

    /**
     * Countdown callback — runs every 1 second.
     * When time reaches 0 the player loses a life.
     */
    updateTimer () {
        if (this.timeRemaining > 0) {
            this.timeRemaining -= 1;
        }

        if (this.timerLabel) {
            this.timerLabel.string = this._zeroPad(this.timeRemaining, 3);
        }

        // Warn the player when time is running low (play hurry-up SFX once)
        if (this.timeRemaining === 100) {
            cc.log('[HudManager] Time is running out!');
            // Could trigger a hurry-up BGM tempo change here
        }

        // Time's up — kill the player
        if (this.timeRemaining <= 0) {
            this.unschedule(this.updateTimer);
            cc.log('[HudManager] TIME UP');

            if (window.AudioManager) {
                window.AudioManager.stopBGM();
                window.AudioManager.playSFX('sfxLoseLife');
            }

            if (window.GameManager) {
                window.GameManager.playerState = 'small';
                window.GameManager.loseLife();
            }
        }
    },

    /**
     * Reset the timer back to the default 400 seconds (e.g. on level restart).
     */
    resetTimer () {
        this.timeRemaining = 400;
        this.unschedule(this.updateTimer);
        this.schedule(this.updateTimer, 1.0);
        cc.log('[HudManager] Timer reset to 400');
    },

    // ───────────────────────── Internal Helpers ─────────────────────────

    /**
     * Pull the latest values from GameManager and push them into every label.
     */
    _refreshAll () {
        var gm = window.GameManager;
        if (!gm) return;

        this.updateScore(gm.score);
        this.updateCoins(gm.coins);
        this.updateLives(gm.lives);

        if (this.worldLabel) {
            this.worldLabel.string = gm.currentLevel || '1-1';
        }
    },

    /**
     * Left-pad a number with zeroes.
     * @param {number} num
     * @param {number} width — total character width
     * @returns {string}
     */
    _zeroPad (num, width) {
        var s = '' + num;
        while (s.length < width) {
            s = '0' + s;
        }
        return s;
    },

    onDestroy () {
        this.unschedule(this.updateTimer);
    },
});
