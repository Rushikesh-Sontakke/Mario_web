// LevelSelectScene.js
// Level selection screen controller.
// Creates all UI programmatically: title, 2×2 level grid, back button, world indicator.
// Unlocked levels use orange buttons; locked ones use gray buttons.

cc.Class({
    extends: cc.Component,

    properties: {},

    onLoad: function () {
        this._canvas = cc.find('Canvas') || this.node;
        this._canvasW = 960;
        this._canvasH = 640;

        // Level definitions
        this._levels = [
            { name: '1-1', scene: 'Level_1_1', row: 0, col: 0 },
            { name: '1-2', scene: 'Level_1_1', row: 0, col: 1 },
            { name: '1-3', scene: 'Level_1_1', row: 1, col: 0 },
            { name: '1-4', scene: 'Level_1_1', row: 1, col: 1 },
        ];

        // Build UI
        this._createBackground();
        this._createWorldIndicator();
        this._createTitle();
        this._createLevelGrid();
        this._createBackButton();
    },

    // ─── Background ──────────────────────────────────────────────────────────
    _createBackground: function () {
        var bg = new cc.Node('BgColor');
        bg.parent = this._canvas;
        bg.setPosition(0, 0);
        bg.zIndex = -10;

        var gfx = bg.addComponent(cc.Graphics);
        gfx.fillColor = new cc.Color(107, 140, 255);
        gfx.rect(-this._canvasW / 2, -this._canvasH / 2, this._canvasW, this._canvasH);
        gfx.fill();
    },

    // ─── World Indicator Image ───────────────────────────────────────────────
    _createWorldIndicator: function () {
        var self = this;
        cc.loader.loadRes('pictures/world', cc.SpriteFrame, function (err, frame) {
            if (err) return;
            var node = new cc.Node('WorldIcon');
            node.parent = self._canvas;
            node.setPosition(0, 240);
            node.zIndex = 1;
            var sp = node.addComponent(cc.Sprite);
            sp.spriteFrame = frame;
        });
    },

    // ─── Title Label ─────────────────────────────────────────────────────────
    _createTitle: function () {
        var node = new cc.Node('Title');
        node.parent = this._canvas;
        node.setPosition(0, 200);
        node.zIndex = 1;

        var lbl = node.addComponent(cc.Label);
        lbl.string = 'SELECT WORLD';
        lbl.fontSize = 36;
        lbl.lineHeight = 40;
        lbl.enableBold = true;
        node.color = cc.Color.WHITE;
    },

    // ─── Level Grid (2×2) ────────────────────────────────────────────────────
    _createLevelGrid: function () {
        var self = this;

        // Determine which levels are unlocked
        var unlocked = ['1-1']; // default
        if (window.GameManager && window.GameManager.unlockedLevels) {
            unlocked = window.GameManager.unlockedLevels;
        }

        // Grid layout params
        var cellW = 180;
        var cellH = 100;
        var gapX = 40;
        var gapY = 30;
        var gridOriginX = -(cellW + gapX) / 2; // center the 2-col grid
        var gridOriginY = 60;

        // Load button sprite frames, then build the grid
        var spriteNames = [
            'pictures/button_orange',
            'pictures/button_orange_hover',
            'pictures/button_oriange_press',
            'pictures/button_gray',
        ];

        var loaded = {};
        var pending = spriteNames.length;

        spriteNames.forEach(function (name) {
            cc.loader.loadRes(name, cc.SpriteFrame, function (err, frame) {
                if (!err) loaded[name] = frame;
                pending--;
                if (pending <= 0) {
                    self._buildGrid(loaded, unlocked, gridOriginX, gridOriginY, cellW, cellH, gapX, gapY);
                }
            });
        });
    },

    _buildGrid: function (frames, unlocked, originX, originY, cellW, cellH, gapX, gapY) {
        var self = this;

        for (var i = 0; i < this._levels.length; i++) {
            var lvl = this._levels[i];
            var isUnlocked = unlocked.indexOf(lvl.name) !== -1;

            // Calculate position in grid
            var px = originX + lvl.col * (cellW + gapX);
            var py = originY - lvl.row * (cellH + gapY);

            var btnNode = new cc.Node('LevelBtn_' + lvl.name);
            btnNode.parent = this._canvas;
            btnNode.setPosition(px, py);
            btnNode.setContentSize(cellW, cellH);
            btnNode.zIndex = 2;

            // Background sprite
            var sp = btnNode.addComponent(cc.Sprite);
            sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

            if (isUnlocked) {
                if (frames['pictures/button_orange']) sp.spriteFrame = frames['pictures/button_orange'];

                // Button component
                var btn = btnNode.addComponent(cc.Button);
                btn.transition = cc.Button.Transition.SPRITE;
                btn.target = btnNode;
                if (frames['pictures/button_orange']) btn.normalSprite = frames['pictures/button_orange'];
                if (frames['pictures/button_orange_hover']) btn.hoverSprite = frames['pictures/button_orange_hover'];
                if (frames['pictures/button_oriange_press']) btn.pressedSprite = frames['pictures/button_oriange_press'];

                // Click handler — use closure to capture level info
                var handler = new cc.Component.EventHandler();
                handler.target = this.node;
                handler.component = 'LevelSelectScene';
                handler.handler = 'onLevelSelected';
                handler.customEventData = lvl.name + '|' + lvl.scene;
                btn.clickEvents.push(handler);
            } else {
                // Locked — gray button, no interaction
                if (frames['pictures/button_gray']) sp.spriteFrame = frames['pictures/button_gray'];
                btnNode.interactable = false;
            }

            // ── Level name label ──
            var lblNode = new cc.Node('LevelLabel');
            lblNode.parent = btnNode;
            lblNode.setPosition(0, isUnlocked ? 0 : 5);

            var lbl = lblNode.addComponent(cc.Label);
            lbl.string = 'World ' + lvl.name;
            lbl.fontSize = 22;
            lbl.lineHeight = 26;
            lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
            lblNode.color = cc.Color.WHITE;

            // ── Lock indicator for locked levels ──
            if (!isUnlocked) {
                var lockNode = new cc.Node('LockText');
                lockNode.parent = btnNode;
                lockNode.setPosition(0, -18);

                var lockLbl = lockNode.addComponent(cc.Label);
                lockLbl.string = '🔒 LOCKED';
                lockLbl.fontSize = 14;
                lockLbl.lineHeight = 18;
                lockNode.color = new cc.Color(180, 180, 180);
            }
        }
    },

    /**
     * Called when an unlocked level button is clicked.
     * customEventData format: "levelName|sceneName"
     */
    onLevelSelected: function (event, customData) {
        var parts = customData.split('|');
        var levelName = parts[0];
        var sceneName = parts[1] || 'Level_1_1';

        cc.log('[LevelSelect] Selected level: ' + levelName + ' → scene: ' + sceneName);

        if (window.GameManager) {
            if (typeof window.GameManager.goToLevel === 'function') {
                window.GameManager.goToLevel(levelName);
                return;
            }
            window.GameManager.currentLevel = levelName;
        }

        cc.director.loadScene(sceneName);
    },

    // ─── Back Button ─────────────────────────────────────────────────────────
    _createBackButton: function () {
        var self = this;

        cc.loader.loadRes('pictures/button_blue', cc.SpriteFrame, function (err0, normalFrame) {
            cc.loader.loadRes('pictures/button_blue_hover', cc.SpriteFrame, function (err1, hoverFrame) {
                cc.loader.loadRes('pictures/button_blue_press', cc.SpriteFrame, function (err2, pressFrame) {
                    self._buildBackButton(normalFrame, hoverFrame, pressFrame);
                });
            });
        });
    },

    _buildBackButton: function (normalFrame, hoverFrame, pressFrame) {
        var btnNode = new cc.Node('BackButton');
        btnNode.parent = this._canvas;
        btnNode.setPosition(0, -220);
        btnNode.setContentSize(160, 50);
        btnNode.zIndex = 2;

        var sp = btnNode.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (normalFrame) sp.spriteFrame = normalFrame;

        var btn = btnNode.addComponent(cc.Button);
        btn.transition = cc.Button.Transition.SPRITE;
        btn.target = btnNode;
        if (normalFrame) btn.normalSprite = normalFrame;
        if (hoverFrame) btn.hoverSprite = hoverFrame;
        if (pressFrame) btn.pressedSprite = pressFrame;

        var handler = new cc.Component.EventHandler();
        handler.target = this.node;
        handler.component = 'LevelSelectScene';
        handler.handler = 'onBackToMenu';
        btn.clickEvents.push(handler);

        // Label
        var lblNode = new cc.Node('BackLabel');
        lblNode.parent = btnNode;
        lblNode.setPosition(0, 0);
        var lbl = lblNode.addComponent(cc.Label);
        lbl.string = 'BACK';
        lbl.fontSize = 22;
        lbl.lineHeight = 26;
        lblNode.color = cc.Color.WHITE;
    },

    onBackToMenu: function () {
        cc.log('[LevelSelect] Back to Menu');
        cc.director.loadScene('Menu');
    },
});
