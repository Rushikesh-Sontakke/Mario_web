// GameOverScene.js
// Game over screen controller.
// Stops BGM, plays game-over sound, shows final score, and provides
// TRY AGAIN / MAIN MENU buttons. All UI built programmatically.

cc.Class({
    extends: cc.Component,

    properties: {},

    onLoad: function () {
        this._canvas = cc.find('Canvas') || this.node;
        this._canvasW = 960;
        this._canvasH = 640;

        // Stop any playing music
        cc.audioEngine.stopMusic();
        cc.audioEngine.stopAllEffects();

        // Play game over sound
        this._playGameOverSound();

        // Build UI
        this._createBackground();
        this._createGameOverText();
        this._createScoreDisplay();
        this._createButtons();
    },

    // ─── Game Over Sound ─────────────────────────────────────────────────────
    _playGameOverSound: function () {
        if (window.AudioManager && typeof window.AudioManager.playEffect === 'function') {
            window.AudioManager.playEffect('Game Over');
        } else {
            cc.loader.loadRes('audio/Game Over', cc.AudioClip, function (err, clip) {
                if (!err && clip) {
                    cc.audioEngine.playEffect(clip, false);
                }
            });
        }
    },

    // ─── Background (black) ──────────────────────────────────────────────────
    _createBackground: function () {
        var bg = new cc.Node('Background');
        bg.parent = this._canvas;
        bg.setPosition(0, 0);
        bg.zIndex = -1;

        var gfx = bg.addComponent(cc.Graphics);
        gfx.fillColor = cc.Color.BLACK;
        gfx.rect(-this._canvasW / 2, -this._canvasH / 2, this._canvasW, this._canvasH);
        gfx.fill();
    },

    // ─── GAME OVER Text ──────────────────────────────────────────────────────
    _createGameOverText: function () {
        var node = new cc.Node('GameOverText');
        node.parent = this._canvas;
        node.setPosition(0, 100);
        node.zIndex = 1;

        var lbl = node.addComponent(cc.Label);
        lbl.string = 'GAME OVER';
        lbl.fontSize = 64;
        lbl.lineHeight = 68;
        lbl.enableBold = true;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        node.color = cc.Color.WHITE;

        // Fade in
        node.opacity = 0;
        cc.tween(node)
            .to(1.0, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    },

    // ─── Score Display ───────────────────────────────────────────────────────
    _createScoreDisplay: function () {
        var score = 0;
        var coins = 0;
        if (window.GameManager) {
            score = window.GameManager.score || 0;
            coins = window.GameManager.coins || 0;
        }

        // Final score
        var scoreNode = new cc.Node('FinalScore');
        scoreNode.parent = this._canvas;
        scoreNode.setPosition(0, 20);
        scoreNode.zIndex = 1;

        var scoreLbl = scoreNode.addComponent(cc.Label);
        scoreLbl.string = 'FINAL SCORE: ' + score;
        scoreLbl.fontSize = 28;
        scoreLbl.lineHeight = 32;
        scoreLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        scoreNode.color = new cc.Color(255, 255, 100); // yellow

        scoreNode.opacity = 0;
        cc.tween(scoreNode)
            .delay(0.5)
            .to(0.8, { opacity: 255 }, { easing: 'sineOut' })
            .start();

        // Coins collected
        var coinNode = new cc.Node('CoinsCollected');
        coinNode.parent = this._canvas;
        coinNode.setPosition(0, -20);
        coinNode.zIndex = 1;

        var coinLbl = coinNode.addComponent(cc.Label);
        coinLbl.string = 'COINS: ' + coins;
        coinLbl.fontSize = 22;
        coinLbl.lineHeight = 26;
        coinLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        coinNode.color = new cc.Color(255, 200, 50);

        coinNode.opacity = 0;
        cc.tween(coinNode)
            .delay(0.8)
            .to(0.6, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    },

    // ─── Buttons ─────────────────────────────────────────────────────────────
    _createButtons: function () {
        var self = this;

        cc.loader.loadRes('pictures/button_blue', cc.SpriteFrame, function (err0, normalFrame) {
            cc.loader.loadRes('pictures/button_blue_hover', cc.SpriteFrame, function (err1, hoverFrame) {
                cc.loader.loadRes('pictures/button_blue_press', cc.SpriteFrame, function (err2, pressFrame) {
                    self._buildButton('TRY AGAIN', 0, -110, normalFrame, hoverFrame, pressFrame, 'onTryAgain');
                    self._buildButton('MAIN MENU', 0, -190, normalFrame, hoverFrame, pressFrame, 'onMainMenu');
                });
            });
        });
    },

    _buildButton: function (label, x, y, normalFrame, hoverFrame, pressFrame, handlerName) {
        var btnNode = new cc.Node('Btn_' + label);
        btnNode.parent = this._canvas;
        btnNode.setPosition(x, y);
        btnNode.setContentSize(200, 55);
        btnNode.zIndex = 2;

        // Sprite background
        var sp = btnNode.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (normalFrame) sp.spriteFrame = normalFrame;

        // Button component
        var btn = btnNode.addComponent(cc.Button);
        btn.transition = cc.Button.Transition.SPRITE;
        btn.target = btnNode;
        if (normalFrame) btn.normalSprite = normalFrame;
        if (hoverFrame) btn.hoverSprite = hoverFrame;
        if (pressFrame) btn.pressedSprite = pressFrame;

        // Click handler
        var handler = new cc.Component.EventHandler();
        handler.target = this.node;
        handler.component = 'GameOverScene';
        handler.handler = handlerName;
        btn.clickEvents.push(handler);

        // Label child
        var lblNode = new cc.Node('Label');
        lblNode.parent = btnNode;
        lblNode.setPosition(0, 0);

        var lbl = lblNode.addComponent(cc.Label);
        lbl.string = label;
        lbl.fontSize = 22;
        lbl.lineHeight = 26;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lblNode.color = cc.Color.WHITE;

        // Fade in
        btnNode.opacity = 0;
        cc.tween(btnNode)
            .delay(1.2)
            .to(0.5, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    },

    // ─── Button Callbacks ────────────────────────────────────────────────────

    /**
     * TRY AGAIN: reset game state and go back to Menu (which leads to level select).
     */
    onTryAgain: function () {
        cc.log('[GameOver] Try Again');
        if (window.GameManager && typeof window.GameManager.resetGame === 'function') {
            window.GameManager.resetGame();
        }
        cc.director.loadScene('Menu');
    },

    /**
     * MAIN MENU: reset game state and return to Menu.
     */
    onMainMenu: function () {
        cc.log('[GameOver] Main Menu');
        if (window.GameManager && typeof window.GameManager.resetGame === 'function') {
            window.GameManager.resetGame();
        }
        cc.director.loadScene('Menu');
    },
});
