// PauseMenu.js
// Pause menu overlay — press Escape to toggle.
// Builds the overlay UI programmatically on load.

cc.Class({
    extends: cc.Component,

    properties: {
        /** The overlay panel node (created at runtime if not assigned) */
        pausePanel: {
            default: null,
            type: cc.Node,
            tooltip: 'Overlay panel node — built automatically if left empty',
        },

        /** Internal pause flag */
        isPaused: {
            default: false,
            visible: false,
        },
    },

    // ───────────────────────────── Lifecycle ─────────────────────────────

    onLoad () {
        // Build the panel UI if none was assigned in the editor
        if (!this.pausePanel) {
            this._createPausePanel();
        }

        // Make sure the panel starts hidden
        this.pausePanel.active = false;

        // Listen for the Escape key
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
    },

    onDestroy () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
    },

    // ───────────────────────────── Input ─────────────────────────────────

    /**
     * Key-down handler — toggles pause on Escape.
     */
    _onKeyDown (event) {
        if (event.keyCode === cc.macro.KEY.escape) {
            this.togglePause();
        }
    },

    // ───────────────────────── Pause Logic ───────────────────────────────

    /**
     * Toggle the pause state on / off.
     */
    togglePause () {
        if (this.isPaused) {
            this.onResume();
        } else {
            this.isPaused = true;
            this.pausePanel.active = true;
            cc.director.pause();
            // Pausing the director freezes scheduled updates but the node
            // tree is still rendered, so the overlay remains visible.
            cc.log('[PauseMenu] Game paused');
        }
    },

    /**
     * Resume the game and hide the panel.
     */
    onResume () {
        this.isPaused = false;
        this.pausePanel.active = false;
        cc.director.resume();
        cc.log('[PauseMenu] Game resumed');
    },

    /**
     * Quit back to the main menu.
     * Resumes first so cc.director.loadScene works correctly.
     */
    onQuit () {
        // Must resume the director before loading a new scene
        cc.director.resume();
        this.isPaused = false;
        cc.log('[PauseMenu] Returning to menu');
        cc.director.loadScene('Menu');
    },

    // ─────────────────── Programmatic UI Construction ───────────────────

    /**
     * Build the entire pause overlay panel from scratch:
     *   • Full-screen semi-transparent black background
     *   • 'PAUSED' title label
     *   • Resume button
     *   • Quit button
     */
    _createPausePanel () {
        var canvas = cc.Canvas.instance;
        var canvasSize = canvas ? canvas.designResolution : cc.size(960, 640);

        // ── Root panel (full-screen dimmed background) ──────────────
        var panel = new cc.Node('PausePanel');
        panel.parent = this.node;

        // Add a sprite so we can colour it; use the built-in single-colour approach
        var panelSprite = panel.addComponent(cc.Sprite);
        panelSprite.type = cc.Sprite.Type.SIMPLE;
        panelSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        panel.color = new cc.Color(0, 0, 0);
        panel.opacity = 150;
        panel.setContentSize(canvasSize.width * 2, canvasSize.height * 2);
        panel.setPosition(0, 0);

        // Widget to stretch across the full canvas
        var widget = panel.addComponent(cc.Widget);
        widget.isAlignTop    = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft   = true;
        widget.isAlignRight  = true;
        widget.top    = 0;
        widget.bottom = 0;
        widget.left   = 0;
        widget.right  = 0;

        // Block clicks from falling through
        var blocker = panel.addComponent(cc.BlockInputEvents);

        // ── 'PAUSED' label ─────────────────────────────────────────
        var titleNode = new cc.Node('PausedTitle');
        titleNode.parent = panel;
        titleNode.setPosition(0, 80);

        var titleLabel = titleNode.addComponent(cc.Label);
        titleLabel.string   = 'PAUSED';
        titleLabel.fontSize = 48;
        titleLabel.lineHeight = 52;
        titleNode.color = cc.Color.WHITE;
        titleNode.opacity = 255;

        // ── Resume button ──────────────────────────────────────────
        this._createButton(panel, 'ResumeBtn', 'RESUME', cc.v2(0, -10), this.onResume);

        // ── Quit button ────────────────────────────────────────────
        this._createButton(panel, 'QuitBtn', 'QUIT', cc.v2(0, -80), this.onQuit);

        this.pausePanel = panel;
    },

    /**
     * Helper — create a labelled button node inside a parent.
     * @param {cc.Node}   parent   — parent node
     * @param {string}    name     — node name
     * @param {string}    text     — button label text
     * @param {cc.Vec2}   pos      — local position
     * @param {Function}  handler  — callback on this component
     */
    _createButton (parent, name, text, pos, handler) {
        // Button background node
        var btnNode = new cc.Node(name);
        btnNode.parent = parent;
        btnNode.setPosition(pos);
        btnNode.setContentSize(200, 50);

        // Give it a visible background sprite
        var btnSprite = btnNode.addComponent(cc.Sprite);
        btnSprite.type     = cc.Sprite.Type.SIMPLE;
        btnSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        btnNode.color   = new cc.Color(60, 60, 60);
        btnNode.opacity = 220;

        // Button component (uses the sprite as the target)
        var btn = btnNode.addComponent(cc.Button);
        btn.transition = cc.Button.Transition.SCALE;
        btn.zoomScale  = 0.95;

        // Wire up click event
        var clickHandler        = new cc.Component.EventHandler();
        clickHandler.target     = this.node;
        clickHandler.component  = 'PauseMenu';
        clickHandler.handler    = handler === this.onResume ? 'onResume' : 'onQuit';
        btn.clickEvents.push(clickHandler);

        // Label child
        var labelNode = new cc.Node('Label');
        labelNode.parent = btnNode;
        labelNode.setPosition(0, 0);

        var label       = labelNode.addComponent(cc.Label);
        label.string    = text;
        label.fontSize  = 28;
        label.lineHeight = 32;
        labelNode.color   = cc.Color.WHITE;
        labelNode.opacity = 255;

        return btnNode;
    },
});
