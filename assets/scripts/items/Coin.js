// Coin.js
// Collectible coin — two modes:
//   1. Static coin (placed in level) — physics sensor, spin animation, collected on contact
//   2. Block coin (spawned by QuestionBlock) — no physics, animated upward pop

cc.Class({
    extends: cc.Component,

    properties: {
        /** Items sprite atlas — items_6, items_7, items_8 (coin spin) */
        itemsAtlas: {
            default: null,
            type: cc.SpriteAtlas,
        },
        /**
         * If true, this coin was spawned from a QuestionBlock.
         * It will animate upward and auto-destroy (no physics).
         */
        isBlockCoin: false,
    },

    onLoad () {
        this._sprite = this.getComponent(cc.Sprite);
        this._isCollected = false;

        // Spin animation
        this._animTimer = 0;
        this._animInterval = 0.12;
        this._frameIndex = 0;
        this._spinFrames = ['items_6', 'items_7', 'items_8'];
    },

    start () {
        // Apply first frame
        this._applyFrame(this._spinFrames[0]);

        if (this.isBlockCoin) {
            this._startBlockCoinAnimation();
        }
    },

    update (dt) {
        if (this._isCollected) return;

        // ── Spin animation ──
        this._animTimer += dt;
        if (this._animTimer >= this._animInterval) {
            this._animTimer -= this._animInterval;
            this._frameIndex = (this._frameIndex + 1) % this._spinFrames.length;
            this._applyFrame(this._spinFrames[this._frameIndex]);
        }
    },

    // ─────────────────────────────────────────────
    // Physics — static coin only (sensor trigger)
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this._isCollected || this.isBlockCoin) return;

        var playerComp = otherCollider.node.getComponent('PlayerController');
        if (!playerComp) return;

        this._collect();
    },

    // ─────────────────────────────────────────────
    // Collection
    // ─────────────────────────────────────────────

    _collect () {
        if (this._isCollected) return;
        this._isCollected = true;

        // Add score + coin
        this._addScore(200);
        this._addCoin(1);

        // Play coin sound
        this._playSound('coin');

        // Destroy
        this.node.destroy();
    },

    // ─────────────────────────────────────────────
    // Block coin animation (spawned from QuestionBlock)
    // ─────────────────────────────────────────────

    _startBlockCoinAnimation () {
        var self = this;

        // Fly upward 48px, then fade and destroy
        cc.tween(this.node)
            .by(0.3, { y: 48 })
            .to(0.2, { opacity: 0 })
            .call(function () {
                // Add score + coin count
                self._addScore(200);
                self._addCoin(1);
                self._playSound('coin');
                self.node.destroy();
            })
            .start();
    },

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    _applyFrame (frameName) {
        if (!this.itemsAtlas || !this._sprite) return;
        var frame = this.itemsAtlas.getSpriteFrame(frameName);
        if (frame) {
            this._sprite.spriteFrame = frame;
        }
    },

    _addScore (points) {
        var gm = cc.find('Canvas/GameManager') || cc.find('GameManager');
        if (gm) {
            var gmComp = gm.getComponent('GameManager');
            if (gmComp && typeof gmComp.addScore === 'function') {
                gmComp.addScore(points);
                return;
            }
        }
        if (window.GameManager && typeof window.GameManager.addScore === 'function') {
            window.GameManager.addScore(points);
        }
    },

    _addCoin (count) {
        var gm = cc.find('Canvas/GameManager') || cc.find('GameManager');
        if (gm) {
            var gmComp = gm.getComponent('GameManager');
            if (gmComp && typeof gmComp.addCoin === 'function') {
                gmComp.addCoin(count);
                return;
            }
        }
        if (window.GameManager && typeof window.GameManager.addCoin === 'function') {
            window.GameManager.addCoin(count);
        }
    },

    _playSound (soundName) {
        var sm = cc.find('Canvas/SoundManager') || cc.find('SoundManager');
        if (sm) {
            var smComp = sm.getComponent('SoundManager');
            if (smComp && typeof smComp.playEffect === 'function') {
                smComp.playEffect(soundName);
                return;
            }
        }
        cc.loader.loadRes('audio/' + soundName, cc.AudioClip, function (err, clip) {
            if (!err && clip) {
                cc.audioEngine.playEffect(clip, false);
            }
        });
    },
});
