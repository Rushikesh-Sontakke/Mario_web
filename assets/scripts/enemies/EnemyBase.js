// EnemyBase.js
// Base enemy component with patrol behavior.
// Attach to any enemy node that has a cc.RigidBody and cc.PhysicsBoxCollider.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Horizontal patrol speed in pixels/s */
        moveSpeed: 60,
        /** 1 = right, -1 = left */
        direction: -1,
        /** Whether this enemy has been killed */
        isDead: false,
        /** Points awarded when this enemy is defeated */
        scoreValue: 100,
        /** Whether the enemy is currently active (moving) */
        isActive: true,
    },

    onLoad () {
        // Cache physics references
        this._rigidBody = this.getComponent(cc.RigidBody);
        this._collider = this.getComponent(cc.PhysicsBoxCollider);

        // Ensure rigid body settings
        if (this._rigidBody) {
            this._rigidBody.type = cc.RigidBodyType.Dynamic;
            this._rigidBody.fixedRotation = true;
        }

        // Track whether we have been activated at least once
        this._hasBeenActivated = false;
    },

    start () {
        // Nothing extra needed; activation check happens in update
    },

    update (dt) {
        if (this.isDead) return;

        // ── Activation gate: only move when within 600px of camera ──
        var camera = cc.Camera.main;
        if (camera) {
            var camX = camera.node.x;
            var dist = Math.abs(this.node.x - camX);
            if (dist > 600) {
                // Too far from camera — freeze movement
                if (this._rigidBody) {
                    var vel = this._rigidBody.linearVelocity;
                    this._rigidBody.linearVelocity = cc.v2(0, vel.y);
                }
                this.isActive = false;
                return;
            }
        }

        this.isActive = true;
        this._hasBeenActivated = true;

        // ── Patrol movement ──
        if (this._rigidBody) {
            var currentVel = this._rigidBody.linearVelocity;
            this._rigidBody.linearVelocity = cc.v2(
                this.moveSpeed * this.direction,
                currentVel.y
            );
        }
    },

    // ─────────────────────────────────────────────
    // Physics collision callbacks
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this.isDead) return;

        var otherNode = otherCollider.node;

        // ── If we hit a wall / ground from the side, reverse direction ──
        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal;

        // Determine which direction the normal points relative to self
        // Box2D reports normal from A→B; if self is body A the normal
        // points away from self, otherwise it points toward self.
        var selfIsA = (contact.colliderA === selfCollider);
        var nx = selfIsA ? normal.x : -normal.x;
        var ny = selfIsA ? normal.y : -normal.y;

        // Side collision (wall or another enemy) — reverse
        if (Math.abs(nx) > 0.7) {
            this.direction = -this.direction;
        }

        // ── Player interaction ──
        var playerComp = otherNode.getComponent('PlayerController');
        if (!playerComp) return;

        // Stomped from above: normal pointing upward from enemy's perspective
        if (ny > 0.5) {
            this.onStomped(playerComp);
        } else if (Math.abs(nx) > 0.5) {
            // Hit from the side — damage the player
            this.onPlayerHit(playerComp);
        }
    },

    // ─────────────────────────────────────────────
    // Virtual methods — override in "subclasses"
    // ─────────────────────────────────────────────

    /**
     * Called when the player stomps on this enemy from above.
     * Override in subclass components (Goomba, KoopaTroopa, etc.)
     * @param {cc.Component} playerComp - The PlayerController component
     */
    onStomped (playerComp) {
        // Default: mark dead and destroy
        this.isDead = true;
        this.node.destroy();
    },

    /**
     * Called when the enemy hits the player from the side.
     * @param {cc.Component} playerComp - The PlayerController component
     */
    onPlayerHit (playerComp) {
        if (playerComp && typeof playerComp.takeDamage === 'function') {
            playerComp.takeDamage();
        }
    },

    /**
     * Helper: add score through GameManager (if it exists).
     * @param {number} points
     */
    addScore (points) {
        var gm = cc.find('Canvas/GameManager') || cc.find('GameManager');
        if (gm) {
            var gmComp = gm.getComponent('GameManager');
            if (gmComp && typeof gmComp.addScore === 'function') {
                gmComp.addScore(points);
                return;
            }
        }
        // Fallback: try global
        if (window.GameManager && typeof window.GameManager.addScore === 'function') {
            window.GameManager.addScore(points);
        }
    },
});
