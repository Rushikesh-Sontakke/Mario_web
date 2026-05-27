// KoopaTroopa.js
// Turtle enemy with shell mechanics — WALKING → SHELL → SLIDING → SHELL cycle.
// Includes all patrol logic (EnemyBase equivalent) directly.

// State constants
var KoopaState = cc.Enum({
    WALKING: 0,
    SHELL: 1,
    SLIDING: 2,
});

cc.Class({
    extends: cc.Component,

    properties: {
        /** Turtle sprite atlas: turtle_0 … turtle_5 */
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

        /** Shell sliding speed */
        shellSpeed: 300,
    },

    onLoad () {
        this._rigidBody = this.getComponent(cc.RigidBody);
        this._sprite = this.getComponent(cc.Sprite);

        if (this._rigidBody) {
            this._rigidBody.type = cc.RigidBodyType.Dynamic;
            this._rigidBody.fixedRotation = true;
        }

        // State
        this.state = KoopaState.WALKING;

        // Animation
        this._animTimer = 0;
        this._animInterval = 0.2;
        this._frameIndex = 0;
        this._walkFrames = ['turtle_0', 'turtle_5'];
    },

    start () {
        this._applyFrame(this._walkFrames[0]);
    },

    update (dt) {
        if (this.isDead) return;

        // ── Camera activation gate ──
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

        // ── Movement based on state ──
        if (this._rigidBody) {
            var vel = this._rigidBody.linearVelocity;

            switch (this.state) {
                case KoopaState.WALKING:
                    this._rigidBody.linearVelocity = cc.v2(
                        this.moveSpeed * this.direction,
                        vel.y
                    );
                    // Walk animation
                    this._animTimer += dt;
                    if (this._animTimer >= this._animInterval) {
                        this._animTimer -= this._animInterval;
                        this._frameIndex = (this._frameIndex + 1) % this._walkFrames.length;
                        this._applyFrame(this._walkFrames[this._frameIndex]);
                    }
                    // Face movement direction
                    this.node.scaleX = this.direction < 0 ? 1 : -1;
                    break;

                case KoopaState.SHELL:
                    // Stationary shell — no horizontal movement
                    this._rigidBody.linearVelocity = cc.v2(0, vel.y);
                    break;

                case KoopaState.SLIDING:
                    this._rigidBody.linearVelocity = cc.v2(
                        this.shellSpeed * this.direction,
                        vel.y
                    );
                    break;
            }
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

        var selfIsA = (contact.colliderA === selfCollider);
        var nx = selfIsA ? normal.x : -normal.x;
        var ny = selfIsA ? normal.y : -normal.y;

        // ── Check for player ──
        var playerComp = otherNode.getComponent('PlayerController');

        if (playerComp) {
            if (ny > 0.5) {
                // Stomped from above
                this.onStomped(playerComp);
            } else if (Math.abs(nx) > 0.5) {
                // Side collision with player
                if (this.state === KoopaState.SHELL) {
                    // Kick the shell
                    this.direction = (playerComp.node.x < this.node.x) ? 1 : -1;
                    this.onStomped(playerComp);
                } else if (this.state === KoopaState.SLIDING) {
                    // Sliding shell hurts player
                    this.onPlayerHit(playerComp);
                } else {
                    // Walking turtle hurts player
                    this.onPlayerHit(playerComp);
                }
            }
            return;
        }

        // ── Sliding shell kills other enemies ──
        if (this.state === KoopaState.SLIDING) {
            var enemyComps = ['Goomba', 'KoopaTroopa', 'EnemyBase'];
            for (var i = 0; i < enemyComps.length; i++) {
                var enemy = otherNode.getComponent(enemyComps[i]);
                if (enemy && enemy !== this && !enemy.isDead) {
                    enemy.isDead = true;
                    // Fling the killed enemy upward
                    var rb = otherNode.getComponent(cc.RigidBody);
                    if (rb) {
                        rb.linearVelocity = cc.v2(this.direction * 100, 300);
                    }
                    // Disable colliders on the killed enemy
                    var cols = otherNode.getComponents(cc.PhysicsBoxCollider);
                    for (var c = 0; c < cols.length; c++) {
                        cols[c].enabled = false;
                    }
                    this._addScore(200);
                    this.scheduleOnce(function () {
                        if (otherNode.isValid) otherNode.destroy();
                    }, 1.0);
                    break;
                }
            }
        }

        // ── Wall reversal (walking or sliding) ──
        if (Math.abs(nx) > 0.7 && !playerComp) {
            if (this.state === KoopaState.WALKING || this.state === KoopaState.SLIDING) {
                this.direction = -this.direction;
            }
        }
    },

    // ─────────────────────────────────────────────
    // Stomp handler — cycles through states
    // ─────────────────────────────────────────────

    onStomped (playerComp) {
        if (this.isDead) return;

        // Bounce the player upward
        if (playerComp) {
            var playerRB = playerComp.getComponent(cc.RigidBody);
            if (playerRB) {
                playerRB.linearVelocity = cc.v2(playerRB.linearVelocity.x, 300);
            }
        }

        switch (this.state) {
            case KoopaState.WALKING:
                // Enter SHELL state
                this.state = KoopaState.SHELL;
                this._applyFrame('turtle_3');
                this._addScore(100);
                this._playSound('stomp');
                break;

            case KoopaState.SHELL:
                // Kick the shell → SLIDING
                this.state = KoopaState.SLIDING;
                // Direction is already set by caller if from side hit
                if (playerComp) {
                    this.direction = (playerComp.node.x < this.node.x) ? 1 : -1;
                }
                this._playSound('kick');
                break;

            case KoopaState.SLIDING:
                // Stop the shell → back to SHELL
                this.state = KoopaState.SHELL;
                this._applyFrame('turtle_3');
                this._playSound('stomp');
                break;
        }
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
        cc.loader.loadRes('sounds/' + soundName, cc.AudioClip, function (err, clip) {
            if (!err && clip) {
                cc.audioEngine.playEffect(clip, false);
            }
        });
    },
});
