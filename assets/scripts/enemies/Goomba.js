// Goomba.js
// Classic Goomba enemy — patrols left/right, squashes when stomped.
// Includes all EnemyBase patrol logic directly (cc.Class has no inheritance).

cc.Class({
    extends: cc.Component,

    properties: {
        /** Goomba sprite atlas containing Goomba_0, Goomba_1, Goomba_2 */
        atlas: {
            default: null,
            type: cc.SpriteAtlas,
        },

        // ── EnemyBase properties ──
        moveSpeed: 60,
        direction: -1,
        isDead: false,
        scoreValue: 100,
        isActive: true,
    },

    onLoad () {
        // Physics references
        this._rigidBody = this.getComponent(cc.RigidBody);
        this._sprite = this.getComponent(cc.Sprite);

        if (this._rigidBody) {
            this._rigidBody.type = cc.RigidBodyType.Dynamic;
            this._rigidBody.fixedRotation = true;
        }

        // Animation state
        this._animTimer = 0;
        this._animInterval = 0.2;  // seconds per frame
        this._frameIndex = 0;
        this._walkFrames = ['Goomba_0', 'Goomba_1'];
    },

    start () {
        // Apply the first walk frame
        this._applyFrame(this._walkFrames[0]);
    },

    update (dt) {
        if (this.isDead) return;

        // ── Camera activation gate (600px) ──
        var camera = cc.Camera.main;
        if (camera) {
            var dist = Math.abs(this.node.x - camera.node.x);
            if (dist > 600) {
                if (this._rigidBody) {
                    var v = this._rigidBody.linearVelocity;
                    this._rigidBody.linearVelocity = cc.v2(0, v.y);
                }
                this.isActive = false;
                return;
            }
        }
        this.isActive = true;

        // ── Patrol movement ──
        if (this._rigidBody) {
            var vel = this._rigidBody.linearVelocity;
            this._rigidBody.linearVelocity = cc.v2(
                this.moveSpeed * this.direction,
                vel.y
            );
        }

        // ── Walk animation ──
        this._animTimer += dt;
        if (this._animTimer >= this._animInterval) {
            this._animTimer -= this._animInterval;
            this._frameIndex = (this._frameIndex + 1) % this._walkFrames.length;
            this._applyFrame(this._walkFrames[this._frameIndex]);
        }
    },

    // ─────────────────────────────────────────────
    // Physics collision
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this.isDead) return;

        var otherNode = otherCollider.node;
        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal;

        // Determine normal direction relative to self
        var selfIsA = (contact.colliderA === selfCollider);
        var nx = selfIsA ? normal.x : -normal.x;
        var ny = selfIsA ? normal.y : -normal.y;

        // ── Wall / obstacle reversal ──
        var playerComp = otherNode.getComponent('PlayerController');
        if (!playerComp) {
            if (Math.abs(nx) > 0.7) {
                this.direction = -this.direction;
            }
            return;
        }

        // ── Player collision ──
        if (ny > 0.5) {
            // Player is above — stomp
            this.onStomped(playerComp);
        } else if (Math.abs(nx) > 0.5) {
            // Player is to the side — damage
            this.onPlayerHit(playerComp);
        }
    },

    // ─────────────────────────────────────────────
    // Stomp & damage
    // ─────────────────────────────────────────────

    onStomped (playerComp) {
        if (this.isDead) return;
        this.isDead = true;

        // Switch to squashed frame
        this._applyFrame('Goomba_2');

        // Stop all movement
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = cc.v2(0, 0);
            this._rigidBody.type = cc.RigidBodyType.Static;
        }

        // Disable collider so the player doesn't keep colliding
        var colliders = this.getComponents(cc.PhysicsBoxCollider);
        for (var i = 0; i < colliders.length; i++) {
            colliders[i].enabled = false;
        }

        // Bounce the player upward
        if (playerComp && playerComp.getComponent) {
            var playerRB = playerComp.getComponent(cc.RigidBody);
            if (playerRB) {
                playerRB.linearVelocity = cc.v2(playerRB.linearVelocity.x, 300);
            }
        }

        // Add score
        this._addScore(this.scoreValue);

        // Play stomp sound
        this._playSound('stomp');

        // Destroy after short delay
        this.scheduleOnce(function () {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
        }, 0.5);
    },

    onPlayerHit (playerComp) {
        if (playerComp && typeof playerComp.takeDamage === 'function') {
            playerComp.takeDamage();
        }
    },

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    _applyFrame (frameName) {
        if (!this.atlas || !this._sprite) return;
        var frame = this.atlas.getSpriteFrame(frameName);
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

    _playSound (soundName) {
        var sm = cc.find('Canvas/SoundManager') || cc.find('SoundManager');
        if (sm) {
            var smComp = sm.getComponent('SoundManager');
            if (smComp && typeof smComp.playEffect === 'function') {
                smComp.playEffect(soundName);
                return;
            }
        }
        // Fallback: try loading from resources
        cc.loader.loadRes('sounds/' + soundName, cc.AudioClip, function (err, clip) {
            if (!err && clip) {
                cc.audioEngine.playEffect(clip, false);
            }
        });
    },
});
