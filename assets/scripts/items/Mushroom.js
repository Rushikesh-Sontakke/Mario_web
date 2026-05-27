// Mushroom.js
// Super Mushroom power-up.
// Spawned by QuestionBlock — rises from the block, then patrols like an enemy.
// On player contact: powers up player and self-destructs.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Patrol speed */
        moveSpeed: 100,
        /** 1 = right, -1 = left */
        direction: 1,
        /** Items atlas (optional — can be set by QuestionBlock) */
        itemsAtlas: {
            default: null,
            type: cc.SpriteAtlas,
        },
    },

    onLoad () {
        this._sprite = this.getComponent(cc.Sprite);
        this._rigidBody = null; // Added after rise animation
        this._isRising = true;
        this._isCollected = false;

        // The mushroom starts without physics — it rises first
        this._startY = this.node.y;
        this._targetY = this.node.y + 16;

        // Apply mushroom sprite
        if (this.itemsAtlas && this._sprite) {
            var frame = this.itemsAtlas.getSpriteFrame('items_0');
            if (frame) this._sprite.spriteFrame = frame;
        }
    },

    start () {
        // Begin rise animation
        var self = this;
        cc.tween(this.node)
            .to(0.3, { y: this._targetY })
            .call(function () {
                self._onRiseComplete();
            })
            .start();
    },

    _onRiseComplete () {
        this._isRising = false;

        // Now add physics components
        this._rigidBody = this.node.addComponent(cc.RigidBody);
        this._rigidBody.type = cc.RigidBodyType.Dynamic;
        this._rigidBody.fixedRotation = true;
        this._rigidBody.gravityScale = 1;

        var collider = this.node.addComponent(cc.PhysicsBoxCollider);
        var size = this.node.getContentSize();
        collider.size = cc.size(size.width, size.height);
        collider.offset = cc.v2(0, 0);
        // Use item collision group if configured, else default
        collider.tag = 4; // item group tag
        collider.apply();
    },

    update (dt) {
        if (this._isRising || this._isCollected) return;

        // Horizontal patrol movement
        if (this._rigidBody) {
            var vel = this._rigidBody.linearVelocity;
            this._rigidBody.linearVelocity = cc.v2(
                this.moveSpeed * this.direction,
                vel.y
            );
        }
    },

    // ─────────────────────────────────────────────
    // Physics collision
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this._isCollected || this._isRising) return;

        var otherNode = otherCollider.node;
        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal;

        var selfIsA = (contact.colliderA === selfCollider);
        var nx = selfIsA ? normal.x : -normal.x;

        // ── Player collection ──
        var playerComp = otherNode.getComponent('PlayerController');
        if (playerComp) {
            this._onCollected(playerComp);
            return;
        }

        // ── Wall reversal ──
        if (Math.abs(nx) > 0.7) {
            this.direction = -this.direction;
        }
    },

    _onCollected (playerComp) {
        if (this._isCollected) return;
        this._isCollected = true;

        // Power up the player
        if (typeof playerComp.powerUp === 'function') {
            playerComp.powerUp();
        }

        // Play power-up sound
        this._playSound('PowerUp');

        // Destroy self
        this.node.destroy();
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
