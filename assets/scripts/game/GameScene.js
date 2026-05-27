// GameScene.js
// Main gameplay scene controller — the most important script.
// Responsibilities:
//  1. Enable physics and collision systems
//  2. Build the scene hierarchy programmatically (GameLayer, Camera, HUD)
//  3. Delegate level construction to LevelBuilder
//  4. Manage game state: playing → paused / gameover / levelclear
//  5. HUD updates (score, coins, lives, world, timer)
//  6. Handle player death and level completion

cc.Class({
    extends: cc.Component,

    properties: {
        /** Reference to the LevelBuilder component (set in editor or found at runtime) */
        levelBuilder: {
            default: null,
            type: cc.Component,
        },

        /** HUD overlay node (created programmatically) */
        hudNode: {
            default: null,
            type: cc.Node,
        },

        /** Player node — set after the level is built */
        playerNode: {
            default: null,
            type: cc.Node,
        },

        /** Current game state: 'playing', 'paused', 'gameover', 'levelclear' */
        gameState: 'playing',
    },

    onLoad: function () {
        var self = this;

        // ── 1. Enable Physics ────────────────────────────────────────────────
        var physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -960);

        // Optional: debug draw (disable in production)
        // physicsManager.debugDrawFlags =
        //     cc.PhysicsManager.DrawBits.e_aabbBit |
        //     cc.PhysicsManager.DrawBits.e_shapeBit;

        // ── 2. Enable Collision Manager ──────────────────────────────────────
        var collisionManager = cc.director.getCollisionManager();
        collisionManager.enabled = true;

        // ── 3. Canvas reference ──────────────────────────────────────────────
        this._canvas = cc.find('Canvas') || this.node;
        this._canvasW = 960;
        this._canvasH = 640;

        // ── 4. Build the scene hierarchy ─────────────────────────────────────
        this._gameLayer = null;
        this._cameraNode = null;
        this._hudLabels = {};
        this._timer = 400; // countdown timer (classic Mario style)
        this._timerRunning = false;

        this._buildSceneHierarchy();

        // ── 5. Build the level ───────────────────────────────────────────────
        this._buildLevel();

        // ── 6. Set state ─────────────────────────────────────────────────────
        this.gameState = 'playing';
        this._timerRunning = true;

        // ── 7. Start BGM ─────────────────────────────────────────────────────
        if (window.AudioManager && typeof window.AudioManager.playBGM === 'function') {
            window.AudioManager.playBGM('bgm_1');
        } else {
            cc.loader.loadRes('audio/bgm_1', cc.AudioClip, function (err, clip) {
                if (!err && clip) {
                    cc.audioEngine.playMusic(clip, true);
                }
            });
        }

        // ── 8. Keyboard shortcuts ────────────────────────────────────────────
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
    },

    onDestroy: function () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
    },

    // =====================================================================
    //  SCENE HIERARCHY BUILDER
    // =====================================================================

    /**
     * Builds the following node tree under Canvas:
     *   Canvas
     *   ├─ GameLayer (all game objects)
     *   │   ├─ Background (ParallaxBg)
     *   │   ├─ TileLayer
     *   │   ├─ Player
     *   │   ├─ Enemies
     *   │   ├─ Items / Blocks
     *   │   ├─ FlagPole
     *   │   └─ DeathZone
     *   ├─ Camera (CameraFollow)
     *   └─ HUD (fixed overlay — NOT child of GameLayer)
     */
    _buildSceneHierarchy: function () {
        // ── Game Layer ──
        this._gameLayer = new cc.Node('GameLayer');
        this._gameLayer.parent = this._canvas;
        this._gameLayer.setPosition(0, 0);
        this._gameLayer.zIndex = 0;

        // Sub-layers inside GameLayer for organization
        this._bgLayer = new cc.Node('BackgroundLayer');
        this._bgLayer.parent = this._gameLayer;
        this._bgLayer.zIndex = -5;

        this._tileLayer = new cc.Node('TileLayer');
        this._tileLayer.parent = this._gameLayer;
        this._tileLayer.zIndex = 0;

        this._entityLayer = new cc.Node('EntityLayer');
        this._entityLayer.parent = this._gameLayer;
        this._entityLayer.zIndex = 1;

        // ── Camera Node ──
        this._cameraNode = new cc.Node('MainCamera');
        this._cameraNode.parent = this._canvas;
        this._cameraNode.zIndex = 0;

        // Add cc.Camera component
        var cam = this._cameraNode.addComponent(cc.Camera);
        cam.zoomRatio = 1;
        // The camera targets the GameLayer (and its children)
        cam.targets = [];  // Will be set after level is built
        cam.backgroundColor = new cc.Color(107, 140, 255, 255);

        // Add CameraFollow script
        var camFollow = null;
        try {
            camFollow = this._cameraNode.addComponent('CameraFollow');
        } catch (e) {
            cc.warn('[GameScene] CameraFollow script not found — camera will not follow player');
        }
        this._cameraFollow = camFollow;

        // ── Death Zone ──
        var deathZoneNode = new cc.Node('DeathZone');
        deathZoneNode.parent = this._gameLayer;
        deathZoneNode.zIndex = 10;
        try {
            deathZoneNode.addComponent('DeathZone');
        } catch (e) {
            cc.warn('[GameScene] DeathZone script not found');
        }

        // ── Parallax Background ──
        var parallaxNode = new cc.Node('ParallaxBg');
        parallaxNode.parent = this._bgLayer;
        try {
            var pbg = parallaxNode.addComponent('ParallaxBg');
            pbg.cameraNode = this._cameraNode;
        } catch (e) {
            cc.warn('[GameScene] ParallaxBg script not found');
        }

        // ── HUD (not a child of GameLayer — stays fixed on screen) ──
        this._buildHUD();
    },

    // =====================================================================
    //  LEVEL BUILDING
    // =====================================================================

    _buildLevel: function () {
        // Try to find LevelBuilder component
        if (!this.levelBuilder) {
            var lbNode = cc.find('Canvas/LevelBuilder') || cc.find('LevelBuilder');
            if (lbNode) {
                this.levelBuilder = lbNode.getComponent('LevelBuilder');
            }
        }

        if (this.levelBuilder && typeof this.levelBuilder.buildLevel === 'function') {
            // Delegate full level building to LevelBuilder
            var levelName = '1-1';
            if (window.GameManager && window.GameManager.currentLevel) {
                levelName = window.GameManager.currentLevel;
            }
            this.levelBuilder.buildLevel(levelName, this._gameLayer, this._tileLayer, this._entityLayer);

            // After building, grab the player node
            this.playerNode = this.levelBuilder.playerNode || cc.find('Canvas/GameLayer/EntityLayer/Player');
        } else {
            cc.warn('[GameScene] No LevelBuilder found — creating a minimal test level');
            this._createMinimalTestLevel();
        }

        // Configure the camera to follow the player
        if (this._cameraFollow && this.playerNode) {
            this._cameraFollow.target = this.playerNode;
        }
    },

    /**
     * Fallback: create a very basic test level if LevelBuilder is not available.
     * This ensures the scene is not empty during development.
     */
    _createMinimalTestLevel: function () {
        // ── Ground ──
        var ground = new cc.Node('Ground');
        ground.parent = this._tileLayer;
        ground.setPosition(3200, 16);  // center of 6400-wide level, near bottom
        ground.setContentSize(6400, 32);
        ground.group = 'ground';

        var gfx = ground.addComponent(cc.Graphics);
        gfx.fillColor = new cc.Color(139, 90, 43);
        gfx.rect(-3200, -16, 6400, 32);
        gfx.fill();

        var groundRb = ground.addComponent(cc.RigidBody);
        groundRb.type = cc.RigidBodyType.Static;

        var groundCol = ground.addComponent(cc.PhysicsBoxCollider);
        groundCol.size = cc.size(6400, 32);
        groundCol.offset = cc.v2(0, 0);
        groundCol.apply();

        // ── Player placeholder ──
        this.playerNode = new cc.Node('Player');
        this.playerNode.parent = this._entityLayer;
        this.playerNode.setPosition(100, 100);
        this.playerNode.setContentSize(16, 16);
        this.playerNode.group = 'player';

        var playerGfx = this.playerNode.addComponent(cc.Graphics);
        playerGfx.fillColor = cc.Color.RED;
        playerGfx.rect(-8, -8, 16, 16);
        playerGfx.fill();

        var playerRb = this.playerNode.addComponent(cc.RigidBody);
        playerRb.type = cc.RigidBodyType.Dynamic;
        playerRb.fixedRotation = true;

        var playerCol = this.playerNode.addComponent(cc.PhysicsBoxCollider);
        playerCol.size = cc.size(16, 16);
        playerCol.offset = cc.v2(0, 0);
        playerCol.density = 1;
        playerCol.friction = 0.4;
        playerCol.restitution = 0;
        playerCol.apply();
    },

    // =====================================================================
    //  HUD
    // =====================================================================

    _buildHUD: function () {
        this.hudNode = new cc.Node('HUD');
        this.hudNode.parent = this._canvas;
        this.hudNode.setPosition(0, 0);
        this.hudNode.zIndex = 100;  // always on top

        // Add a Widget so it stays anchored to the camera view
        var widget = this.hudNode.addComponent(cc.Widget);
        widget.isAlignTop = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.left = 0;
        widget.right = 0;
        widget.alignMode = cc.Widget.AlignMode.ON_WINDOW_RESIZE;

        // ── Score ──
        this._hudLabels.score = this._createHUDLabel('SCORE', '000000', -380, 280);

        // ── Coins ──
        this._hudLabels.coins = this._createHUDLabel('COINS', 'x00', -160, 280);

        // ── World ──
        var worldName = '1-1';
        if (window.GameManager && window.GameManager.currentLevel) {
            worldName = window.GameManager.currentLevel;
        }
        this._hudLabels.world = this._createHUDLabel('WORLD', worldName, 60, 280);

        // ── Lives ──
        var livesCount = 3;
        if (window.GameManager && window.GameManager.lives != null) {
            livesCount = window.GameManager.lives;
        }
        this._hudLabels.lives = this._createHUDLabel('LIVES', 'x' + livesCount, 220, 280);

        // ── Timer ──
        this._hudLabels.timer = this._createHUDLabel('TIME', '400', 380, 280);
    },

    /**
     * Helper: creates a HUD label with a title line and a value line.
     * Returns the value label component so it can be updated.
     */
    _createHUDLabel: function (title, value, x, y) {
        var container = new cc.Node('HUD_' + title);
        container.parent = this.hudNode;
        container.setPosition(x, y);

        // Title
        var titleNode = new cc.Node('Title');
        titleNode.parent = container;
        titleNode.setPosition(0, 14);
        var titleLbl = titleNode.addComponent(cc.Label);
        titleLbl.string = title;
        titleLbl.fontSize = 14;
        titleLbl.lineHeight = 16;
        titleLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        titleNode.color = cc.Color.WHITE;

        // Value
        var valNode = new cc.Node('Value');
        valNode.parent = container;
        valNode.setPosition(0, -6);
        var valLbl = valNode.addComponent(cc.Label);
        valLbl.string = value;
        valLbl.fontSize = 18;
        valLbl.lineHeight = 20;
        valLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        valNode.color = cc.Color.WHITE;

        return valLbl;
    },

    _updateHUD: function () {
        var gm = window.GameManager;

        if (this._hudLabels.score) {
            var score = (gm && gm.score != null) ? gm.score : 0;
            this._hudLabels.score.string = this._padNumber(score, 6);
        }

        if (this._hudLabels.coins) {
            var coins = (gm && gm.coins != null) ? gm.coins : 0;
            this._hudLabels.coins.string = 'x' + this._padNumber(coins, 2);
        }

        if (this._hudLabels.lives) {
            var lives = (gm && gm.lives != null) ? gm.lives : 3;
            this._hudLabels.lives.string = 'x' + lives;
        }

        if (this._hudLabels.timer) {
            this._hudLabels.timer.string = '' + Math.ceil(this._timer);
        }
    },

    _padNumber: function (num, digits) {
        var s = '' + num;
        while (s.length < digits) s = '0' + s;
        return s;
    },

    // =====================================================================
    //  GAME LOOP
    // =====================================================================

    update: function (dt) {
        if (this.gameState !== 'playing') return;

        // Update the countdown timer
        if (this._timerRunning) {
            this._timer -= dt;
            if (this._timer <= 0) {
                this._timer = 0;
                this._timerRunning = false;
                // Time up — kill the player
                this.onPlayerDied();
            }
        }

        // Refresh HUD labels every frame
        this._updateHUD();

        // Move GameLayer opposite to camera to simulate camera scrolling
        // This is the approach when not using cc.Camera's built-in culling
        if (this._cameraNode && this._gameLayer) {
            this._gameLayer.x = -(this._cameraNode.x - this._canvasW / 2);
            this._gameLayer.y = -(this._cameraNode.y - this._canvasH / 2);
        }
    },

    // =====================================================================
    //  GAME STATE MANAGEMENT
    // =====================================================================

    /**
     * Called when the player dies (fell, hit enemy, time-up).
     */
    onPlayerDied: function () {
        if (this.gameState !== 'playing') return;
        this.gameState = 'gameover';
        this._timerRunning = false;

        cc.log('[GameScene] Player died');

        // Stop BGM
        cc.audioEngine.stopMusic();

        // Play death sound
        if (window.AudioManager && typeof window.AudioManager.playEffect === 'function') {
            window.AudioManager.playEffect('loseOneLife');
        } else {
            cc.loader.loadRes('audio/loseOneLife', cc.AudioClip, function (err, clip) {
                if (!err && clip) cc.audioEngine.playEffect(clip, false);
            });
        }

        // Deduct a life
        if (window.GameManager) {
            if (typeof window.GameManager.onPlayerDied === 'function') {
                // Delay the scene transition so the death animation plays
                this.scheduleOnce(function () {
                    window.GameManager.onPlayerDied();
                }, 2.5);
                return;
            }

            window.GameManager.lives = (window.GameManager.lives || 3) - 1;
            if (window.GameManager.lives <= 0) {
                this.scheduleOnce(function () {
                    cc.director.loadScene('GameOver');
                }, 2.5);
                return;
            }
        }

        // Restart the level after a delay
        this.scheduleOnce(function () {
            cc.director.loadScene(cc.director.getScene().name);
        }, 2.5);
    },

    /**
     * Called when the player reaches the flag pole / end of level.
     */
    onLevelClear: function () {
        if (this.gameState !== 'playing') return;
        this.gameState = 'levelclear';
        this._timerRunning = false;

        cc.log('[GameScene] Level Clear!');

        // Stop BGM, play victory jingle
        cc.audioEngine.stopMusic();
        if (window.AudioManager && typeof window.AudioManager.playEffect === 'function') {
            window.AudioManager.playEffect('levelClear');
        } else {
            cc.loader.loadRes('audio/levelClear', cc.AudioClip, function (err, clip) {
                if (!err && clip) cc.audioEngine.playEffect(clip, false);
            });
        }

        // Award remaining time as score (10 pts per second)
        if (window.GameManager && typeof window.GameManager.addScore === 'function') {
            window.GameManager.addScore(Math.ceil(this._timer) * 10);
        }

        // Unlock next level
        if (window.GameManager) {
            var current = window.GameManager.currentLevel || '1-1';
            var nextMap = { '1-1': '1-2', '1-2': '1-3', '1-3': '1-4' };
            var next = nextMap[current];
            if (next && window.GameManager.unlockedLevels) {
                if (window.GameManager.unlockedLevels.indexOf(next) === -1) {
                    window.GameManager.unlockedLevels.push(next);
                }
            }
        }

        // Transition back to level select after a delay
        this.scheduleOnce(function () {
            cc.director.loadScene('LevelSelect');
        }, 5.0);
    },

    /**
     * Restart the current level.
     */
    restartLevel: function () {
        cc.director.loadScene(cc.director.getScene().name);
    },

    // =====================================================================
    //  INPUT
    // =====================================================================

    _onKeyDown: function (event) {
        switch (event.keyCode) {
            case cc.macro.KEY.escape:
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                    cc.game.pause();
                    cc.log('[GameScene] Game Paused');
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                    cc.game.resume();
                    cc.log('[GameScene] Game Resumed');
                }
                break;
        }
    },
});
