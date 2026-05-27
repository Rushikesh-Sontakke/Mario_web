// MenuScene.js
// Main menu scene controller.
// Builds the entire menu UI programmatically: background, title, buttons, decorations.
// Ensures GameManager and AudioManager singleton nodes exist.

cc.Class({
    extends: cc.Component,

    properties: {},

    onLoad: function () {
        var self = this;

        // ── Ensure global managers exist ─────────────────────────────────────
        this._ensureGameManager();
        this._ensureAudioManager();

        // ── Get canvas node & size ───────────────────────────────────────────
        this._canvas = cc.find('Canvas');
        if (!this._canvas) this._canvas = this.node;
        this._canvasW = 960;
        this._canvasH = 640;

        // ── Build UI layers ──────────────────────────────────────────────────
        this._createBackground();
        this._createTitle();
        this._createStartButton();
        this._createCopyrightText();

        // ── Play menu BGM ────────────────────────────────────────────────────
        if (window.AudioManager && typeof window.AudioManager.playBGM === 'function') {
            window.AudioManager.playBGM('bgm_1');
        } else {
            // Fallback: load and play directly
            cc.loader.loadRes('audio/bgm_1', cc.AudioClip, function (err, clip) {
                if (!err && clip) {
                    cc.audioEngine.playMusic(clip, true);
                }
            });
        }
    },

    // ─── Background ──────────────────────────────────────────────────────────
    _createBackground: function () {
        var self = this;

        // Solid sky-blue background (fallback while image loads)
        var bgColor = new cc.Node('BgColor');
        bgColor.parent = this._canvas;
        bgColor.setContentSize(this._canvasW, this._canvasH);
        bgColor.setPosition(0, 0);
        bgColor.zIndex = -10;
        var gfx = bgColor.addComponent(cc.Graphics);
        gfx.fillColor = new cc.Color(107, 140, 255);
        gfx.rect(-this._canvasW / 2, -this._canvasH / 2, this._canvasW, this._canvasH);
        gfx.fill();

        // Load menu_bg.png image
        cc.loader.loadRes('pictures/menu_bg', cc.SpriteFrame, function (err, spriteFrame) {
            if (err) {
                cc.warn('[MenuScene] Could not load menu_bg.png: ' + err);
                return;
            }
            var bgImg = new cc.Node('BgImage');
            bgImg.parent = self._canvas;
            bgImg.setPosition(0, 0);
            bgImg.zIndex = -9;
            var sp = bgImg.addComponent(cc.Sprite);
            sp.spriteFrame = spriteFrame;
            sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            bgImg.setContentSize(self._canvasW, self._canvasH);
        });
    },

    // ─── Title Image ─────────────────────────────────────────────────────────
    _createTitle: function () {
        var self = this;

        cc.loader.loadRes('pictures/title_1', cc.SpriteFrame, function (err, spriteFrame) {
            if (err) {
                cc.warn('[MenuScene] Could not load title_1.png: ' + err);
                // Fallback: text label
                self._createTitleLabel();
                return;
            }

            var titleNode = new cc.Node('Title');
            titleNode.parent = self._canvas;
            titleNode.setPosition(0, 130);
            titleNode.zIndex = 1;

            var sp = titleNode.addComponent(cc.Sprite);
            sp.spriteFrame = spriteFrame;

            // Start invisible, then fade in
            titleNode.opacity = 0;
            cc.tween(titleNode)
                .to(1.0, { opacity: 255 }, { easing: 'sineOut' })
                .start();
        });
    },

    /** Fallback if the title image fails to load */
    _createTitleLabel: function () {
        var titleNode = new cc.Node('TitleLabel');
        titleNode.parent = this._canvas;
        titleNode.setPosition(0, 140);
        titleNode.zIndex = 1;

        var lbl = titleNode.addComponent(cc.Label);
        lbl.string = 'SUPER MARIO BROS';
        lbl.fontSize = 48;
        lbl.lineHeight = 52;
        lbl.enableBold = true;
        titleNode.color = cc.Color.WHITE;

        titleNode.opacity = 0;
        cc.tween(titleNode)
            .to(1.0, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    },

    // ─── START GAME Button ───────────────────────────────────────────────────
    _createStartButton: function () {
        var self = this;

        // We need to load button sprites first
        var resKeys = [
            'pictures/button_blue',
            'pictures/button_blue_hover',
            'pictures/button_blue_press',
        ];

        cc.loader.loadRes(resKeys[0], cc.SpriteFrame, function (err0, normalFrame) {
            cc.loader.loadRes(resKeys[1], cc.SpriteFrame, function (err1, hoverFrame) {
                cc.loader.loadRes(resKeys[2], cc.SpriteFrame, function (err2, pressFrame) {
                    self._buildStartButton(normalFrame, hoverFrame, pressFrame);
                });
            });
        });
    },

    _buildStartButton: function (normalFrame, hoverFrame, pressFrame) {
        var self = this;

        // ── Button node ──
        var btnNode = new cc.Node('StartButton');
        btnNode.parent = this._canvas;
        btnNode.setPosition(0, -80);
        btnNode.zIndex = 2;

        // Sprite for button background
        var sp = btnNode.addComponent(cc.Sprite);
        if (normalFrame) {
            sp.spriteFrame = normalFrame;
        }
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        btnNode.setContentSize(200, 60);

        // cc.Button component
        var btn = btnNode.addComponent(cc.Button);
        btn.transition = cc.Button.Transition.SPRITE;
        if (normalFrame) btn.normalSprite = normalFrame;
        if (hoverFrame) btn.hoverSprite = hoverFrame;
        if (pressFrame) btn.pressedSprite = pressFrame;
        btn.target = btnNode;

        // Click handler
        var handler = new cc.Component.EventHandler();
        handler.target = this.node;
        handler.component = 'MenuScene';
        handler.handler = 'onStartGame';
        btn.clickEvents.push(handler);

        // ── Label child ──
        var lblNode = new cc.Node('BtnLabel');
        lblNode.parent = btnNode;
        lblNode.setPosition(0, 0);

        var lbl = lblNode.addComponent(cc.Label);
        lbl.string = 'START GAME';
        lbl.fontSize = 24;
        lbl.lineHeight = 28;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lblNode.color = cc.Color.WHITE;

        // Fade-in with slight delay
        btnNode.opacity = 0;
        cc.tween(btnNode)
            .delay(0.6)
            .to(0.5, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    },

    /**
     * Called when the START GAME button is clicked.
     */
    onStartGame: function () {
        cc.log('[MenuScene] Start Game pressed — loading LevelSelect');
        cc.director.loadScene('LevelSelect');
    },

    // ─── Copyright Text ──────────────────────────────────────────────────────
    _createCopyrightText: function () {
        var node = new cc.Node('Copyright');
        node.parent = this._canvas;
        node.setPosition(0, -260);
        node.zIndex = 1;

        var lbl = node.addComponent(cc.Label);
        lbl.string = '© NINTENDO  |  Fan Project';
        lbl.fontSize = 14;
        lbl.lineHeight = 18;
        node.color = new cc.Color(200, 200, 200);

        node.opacity = 0;
        cc.tween(node)
            .delay(1.0)
            .to(0.6, { opacity: 255 })
            .start();
    },

    // ─── Manager Bootstrap ───────────────────────────────────────────────────
    _ensureGameManager: function () {
        if (window.GameManager) return;

        // Look for an existing persistent GameManager node
        var existing = cc.find('GameManager');
        if (existing) {
            var comp = existing.getComponent('GameManager');
            if (comp) {
                window.GameManager = comp;
                return;
            }
        }

        // Create a stub GameManager if the real script isn't loaded yet
        cc.log('[MenuScene] GameManager not found — creating stub');
        var gmNode = new cc.Node('GameManager');
        cc.game.addPersistRootNode(gmNode);

        // Try adding the real component; if script not registered, create a basic stub
        var gmComp = null;
        try {
            gmComp = gmNode.addComponent('GameManager');
        } catch (e) {
            // Script not available yet; create an inline stub
            gmComp = gmNode.addComponent(cc.Component);
            gmComp.score = 0;
            gmComp.coins = 0;
            gmComp.lives = 3;
            gmComp.currentLevel = '1-1';
            gmComp.unlockedLevels = ['1-1'];
            gmComp.goToLevel = function (levelName) {
                this.currentLevel = levelName;
                cc.director.loadScene('Level_1_1');
            };
            gmComp.resetGame = function () {
                this.score = 0;
                this.coins = 0;
                this.lives = 3;
            };
            gmComp.addScore = function (pts) { this.score += pts; };
            gmComp.addCoin = function () {
                this.coins++;
                if (this.coins >= 100) {
                    this.coins = 0;
                    this.lives++;
                }
            };
            gmComp.onPlayerDied = function () {
                this.lives--;
                if (this.lives <= 0) {
                    cc.director.loadScene('GameOver');
                } else {
                    cc.director.loadScene(cc.director.getScene().name);
                }
            };
        }

        window.GameManager = gmComp;
    },

    _ensureAudioManager: function () {
        if (window.AudioManager) return;

        var existing = cc.find('AudioManager');
        if (existing) {
            var comp = existing.getComponent('AudioManager');
            if (comp) {
                window.AudioManager = comp;
                return;
            }
        }

        cc.log('[MenuScene] AudioManager not found — creating stub');
        var amNode = new cc.Node('AudioManager');
        cc.game.addPersistRootNode(amNode);

        var amComp = null;
        try {
            amComp = amNode.addComponent('AudioManager');
        } catch (e) {
            amComp = amNode.addComponent(cc.Component);
            amComp._bgmId = -1;
            amComp.playBGM = function (name) {
                var self = this;
                cc.audioEngine.stopMusic();
                cc.loader.loadRes('audio/' + name, cc.AudioClip, function (err, clip) {
                    if (!err && clip) {
                        self._bgmId = cc.audioEngine.playMusic(clip, true);
                    }
                });
            };
            amComp.stopBGM = function () {
                cc.audioEngine.stopMusic();
            };
            amComp.playEffect = function (name) {
                cc.loader.loadRes('audio/' + name, cc.AudioClip, function (err, clip) {
                    if (!err && clip) {
                        cc.audioEngine.playEffect(clip, false);
                    }
                });
            };
        }

        window.AudioManager = amComp;
    },
});
