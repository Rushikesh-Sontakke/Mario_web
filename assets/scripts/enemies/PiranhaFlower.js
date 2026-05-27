// PiranhaFlower.js
// Flower enemy that emerges from pipes on a timer.
// Uses programmatic position animation — NOT physics-based movement.
// Has a static sensor collider for damage detection only.

var FlowerState = cc.Enum({
    HIDDEN: 0,
    EMERGING: 1,
    IDLE: 2,
    RETREATING: 3,
});

cc.Class({
    extends: cc.Component,

    properties: {
        /** Flower sprite atlas: flower_0, flower_1 */
        atlas: {
            default: null,
            type: cc.SpriteAtlas,
        },
        /** How far the flower rises above the pipe (px) */
        emergeHeight: 32,
        /** Speed of emerge / retreat animation (px/s) */
        emergeSpeed: 30,
    },

    onLoad () {
        this._sprite = this.getComponent(cc.Sprite);

        // Store the base (hidden) Y position — fully inside the pipe
        this._baseY = this.node.y;
        // Target Y when fully emerged
        this._topY = this._baseY + this.emergeHeight;

        // State machine
        this._state = FlowerState.HIDDEN;
        this._stateTimer = 0;

        // Idle / hidden duration (seconds)
        this._hiddenDuration = 2.0;
        this._idleDuration = 2.0;

        // Animation
        this._animTimer = 0;
        this._animInterval = 0.25;
        this._frameIndex = 0;
        this._frames = ['flower_0', 'flower_1'];

        // Start hidden
        this.node.y = this._baseY;
    },

    start () {
        this._applyFrame(this._frames[0]);
    },

    update (dt) {
        // ── Sprite animation (always runs) ──
        this._animTimer += dt;
        if (this._animTimer >= this._animInterval) {
            this._animTimer -= this._animInterval;
            this._frameIndex = (this._frameIndex + 1) % this._frames.length;
            this._applyFrame(this._frames[this._frameIndex]);
        }

        // ── State machine ──
        this._stateTimer += dt;

        switch (this._state) {
            case FlowerState.HIDDEN:
                this.node.y = this._baseY;
                if (this._stateTimer >= this._hiddenDuration) {
                    // Check if player is directly above the pipe
                    if (this._isPlayerAbove()) {
                        // Stay hidden — reset timer
                        this._stateTimer = 0;
                    } else {
                        this._changeState(FlowerState.EMERGING);
                    }
                }
                break;

            case FlowerState.EMERGING:
                this.node.y += this.emergeSpeed * dt;
                if (this.node.y >= this._topY) {
                    this.node.y = this._topY;
                    this._changeState(FlowerState.IDLE);
                }
                break;

            case FlowerState.IDLE:
                if (this._stateTimer >= this._idleDuration) {
                    this._changeState(FlowerState.RETREATING);
                }
                break;

            case FlowerState.RETREATING:
                this.node.y -= this.emergeSpeed * dt;
                if (this.node.y <= this._baseY) {
                    this.node.y = this._baseY;
                    this._changeState(FlowerState.HIDDEN);
                }
                break;
        }
    },

    // ─────────────────────────────────────────────
    // Physics — sensor only (always damages player)
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        // Piranha plant cannot be stomped — always hurts the player
        var playerComp = otherCollider.node.getComponent('PlayerController');
        if (playerComp && typeof playerComp.takeDamage === 'function') {
            playerComp.takeDamage();
        }
    },

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    _changeState (newState) {
        this._state = newState;
        this._stateTimer = 0;
    },

    /**
     * Returns true if the player is within 24px horizontally
     * of this pipe (directly above).
     */
    _isPlayerAbove () {
        var playerNode = cc.find('Canvas/Player') || cc.find('Player');
        if (!playerNode) return false;

        // Convert both to world coords for reliable comparison
        var selfWorld = this.node.parent.convertToWorldSpaceAR(this.node.position);
        var playerWorld = playerNode.parent.convertToWorldSpaceAR(playerNode.position);

        var dx = Math.abs(playerWorld.x - selfWorld.x);
        return dx < 24;
    },

    _applyFrame (frameName) {
        if (!this.atlas || !this._sprite) return;
        var frame = this.atlas.getSpriteFrame(frameName);
        if (frame) {
            this._sprite.spriteFrame = frame;
        }
    },
});
