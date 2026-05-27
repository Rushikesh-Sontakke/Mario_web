// BrickBlock.js
// Breakable brick block.
// Small Mario → bump only.  Big Mario → shatter with debris.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Items sprite atlas (for debris sprite frames if needed) */
        itemsAtlas: {
            default: null,
            type: cc.SpriteAtlas,
        },
    },

    onLoad () {
        this._sprite = this.getComponent(cc.Sprite);
        this._originalY = this.node.y;
        this._isBumping = false;
        this._isBroken = false;
    },

    // ─────────────────────────────────────────────
    // Physics — detect hit from below
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this._isBroken || this._isBumping) return;

        var playerComp = otherCollider.node.getComponent('PlayerController');
        if (!playerComp) return;

        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal;

        var selfIsA = (contact.colliderA === selfCollider);
        var ny = selfIsA ? normal.y : -normal.y;

        // Player hitting from below: normal from block's POV points down
        if (ny < -0.5) {
            this._onHitFromBelow(playerComp);
        }
    },

    // ─────────────────────────────────────────────
    // Hit logic
    // ─────────────────────────────────────────────

    _onHitFromBelow (playerComp) {
        // Determine player size
        var isBig = false;
        if (playerComp.isBig !== undefined) {
            isBig = playerComp.isBig;
        } else if (playerComp.playerState !== undefined) {
            isBig = (playerComp.playerState !== 'small');
        }

        if (isBig) {
            this._breakBlock();
        } else {
            this._bumpBlock();
        }
    },

    /**
     * Bump animation only (small Mario).
     */
    _bumpBlock () {
        if (this._isBumping) return;
        this._isBumping = true;
        var self = this;
        var origY = this._originalY;

        cc.tween(this.node)
            .to(0.1, { y: origY + 8 })
            .to(0.1, { y: origY })
            .call(function () {
                self._isBumping = false;
            })
            .start();

        this._playSound('bump');
    },

    /**
     * Shatter the block into 4 debris pieces and destroy self.
     */
    _breakBlock () {
        this._isBroken = true;

        // Disable collider immediately so nothing else interacts
        var colliders = this.getComponents(cc.PhysicsBoxCollider);
        for (var i = 0; i < colliders.length; i++) {
            colliders[i].enabled = false;
        }
        // Hide the original sprite
        this.node.opacity = 0;

        // Spawn 4 debris pieces
        var offsets = [
            { x: -8, y:  8, vx: -80, vy: 300 },
            { x:  8, y:  8, vx:  80, vy: 300 },
            { x: -8, y: -4, vx: -60, vy: 200 },
            { x:  8, y: -4, vx:  60, vy: 200 },
        ];

        for (var j = 0; j < offsets.length; j++) {
            this._spawnDebris(offsets[j]);
        }

        this._playSound('break');

        // Destroy the block node after debris flies away
        var self = this;
        this.scheduleOnce(function () {
            if (self.node && self.node.isValid) {
                self.node.destroy();
            }
        }, 1.0);
    },

    /**
     * Create a small brick-piece sprite that flies outward.
     */
    _spawnDebris (cfg) {
        var piece = new cc.Node('BrickPiece');
        var sprite = piece.addComponent(cc.Sprite);

        // Try to use a brick debris frame from the atlas, or tint a square
        if (this.itemsAtlas) {
            // Try common brick debris frame names
            var frame = this.itemsAtlas.getSpriteFrame('brick_piece')
                     || this.itemsAtlas.getSpriteFrame('items_28')
                     || this.itemsAtlas.getSpriteFrame('items_24'); // fallback
            if (frame) sprite.spriteFrame = frame;
        }

        // Make the debris small
        piece.setContentSize(8, 8);
        piece.setScale(0.5);

        // Position relative to the block's world position
        piece.parent = this.node.parent;
        piece.x = this.node.x + cfg.x;
        piece.y = this.node.y + cfg.y;

        // Animate: fly outward with gravity-like arc
        var duration = 0.6;
        cc.tween(piece)
            .parallel(
                cc.tween().by(duration, { x: cfg.vx * duration }),
                cc.tween()
                    .by(duration * 0.4, { y: cfg.vy * duration * 0.3 })
                    .by(duration * 0.6, { y: -cfg.vy * duration * 0.8 })
            )
            .call(function () {
                piece.destroy();
            })
            .start();

        // Rotate for visual flair
        cc.tween(piece)
            .by(duration, { angle: (cfg.vx > 0 ? -360 : 360) })
            .start();
    },

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    _playSound (soundName) {
        var sm = cc.find('Canvas/SoundManager') || cc.find('SoundManager');
        if (sm) {
            var smComp = sm.getComponent('SoundManager');
            if (smComp && typeof smComp.playEffect === 'function') {
                smComp.playEffect(soundName);
                return;
            }
        }
        cc.loader.loadRes('sounds/' + soundName, cc.AudioClip, function (err, clip) {
            if (!err && clip) {
                cc.audioEngine.playEffect(clip, false);
            }
        });
    },
});
