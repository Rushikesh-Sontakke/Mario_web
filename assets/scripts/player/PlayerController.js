// PlayerController.js
// Complete physics-based player controller for Mario platformer.
// Requires: cc.RigidBody (Dynamic, fixedRotation, gravityScale 1),
//           cc.PhysicsBoxCollider (player group), cc.Sprite

cc.Class({
    extends: cc.Component,

    properties: {
        moveSpeed: {
            default: 200,
            tooltip: 'Horizontal movement speed',
        },
        jumpForce: {
            default: 550,
            tooltip: 'Jump impulse strength (applied as velocity)',
        },
        maxSpeed: {
            default: 300,
            tooltip: 'Maximum horizontal velocity',
        },
        isGrounded: {
            default: false,
            visible: false,
        },
        isDead: {
            default: false,
            visible: false,
        },
        isBig: {
            default: false,
            tooltip: 'Whether the player is currently Big Mario',
        },
        isInvincible: {
            default: false,
            visible: false,
        },
        invincibleDuration: {
            default: 2.0,
            tooltip: 'Seconds of invincibility after taking damage',
        },
        facingRight: {
            default: true,
            visible: false,
        },
        groundContactCount: {
            default: 0,
            visible: false,
        },
    },

    onLoad () {
        // ---- input tracking ----
        this.keyMap = {};

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);

        // ---- cached components ----
        this.rigidBody = this.getComponent(cc.RigidBody);
        this.sprite    = this.getComponent(cc.Sprite);
        this.animator  = this.getComponent('PlayerAnimator');

        // ---- spawn point (remember starting position for respawn) ----
        this.spawnPoint = cc.v2(this.node.x, this.node.y);

        // ---- invincibility flash helpers ----
        this._invincibleTimer  = 0;
        this._flashTimer       = 0;
        this._flashInterval    = 0.1; // toggle opacity every 0.1 s
    },

    start () {
        // Nothing extra needed; onLoad already initialises everything.
    },

    // ----------------------------------------------------------------
    //  INPUT CALLBACKS
    // ----------------------------------------------------------------

    _onKeyDown (event) {
        this.keyMap[event.keyCode] = true;
    },

    _onKeyUp (event) {
        this.keyMap[event.keyCode] = false;
    },

    // ----------------------------------------------------------------
    //  UPDATE
    // ----------------------------------------------------------------

    update (dt) {
        if (this.isDead) return;

        this._handleMovement(dt);
        this._handleJumpInput();
        this._updateInvincibility(dt);
        this._checkOutOfBounds();
        this._updateAnimatorState();
    },

    // ----------------------------------------------------------------
    //  MOVEMENT
    // ----------------------------------------------------------------

    _handleMovement (dt) {
        var body = this.rigidBody;
        if (!body) return;

        var vel = body.linearVelocity;

        // --- read directional input ---
        var moveLeft  = this.keyMap[cc.macro.KEY.left]  || this.keyMap[cc.macro.KEY.a];
        var moveRight = this.keyMap[cc.macro.KEY.right]  || this.keyMap[cc.macro.KEY.d];

        if (moveLeft && !moveRight) {
            vel.x = -this.moveSpeed;
        } else if (moveRight && !moveLeft) {
            vel.x = this.moveSpeed;
        } else {
            // Apply friction when no input
            vel.x *= 0.85;
            if (Math.abs(vel.x) < 10) vel.x = 0;
        }

        // --- clamp horizontal velocity ---
        if (vel.x > this.maxSpeed)  vel.x = this.maxSpeed;
        if (vel.x < -this.maxSpeed) vel.x = -this.maxSpeed;

        body.linearVelocity = vel;

        // --- flip sprite ---
        if (vel.x > 1) {
            this.facingRight = true;
            this.node.scaleX = Math.abs(this.node.scaleX);
        } else if (vel.x < -1) {
            this.facingRight = false;
            this.node.scaleX = -Math.abs(this.node.scaleX);
        }
    },

    // ----------------------------------------------------------------
    //  JUMP
    // ----------------------------------------------------------------

    _handleJumpInput () {
        var wantsJump = this.keyMap[cc.macro.KEY.space] || this.keyMap[cc.macro.KEY.up] || this.keyMap[cc.macro.KEY.w];

        if (wantsJump && this.groundContactCount > 0) {
            var body = this.rigidBody;
            if (!body) return;

            var vel = body.linearVelocity;
            vel.y = this.jumpForce;
            body.linearVelocity = vel;

            // Prevent repeated jumps while key is held
            this.keyMap[cc.macro.KEY.space] = false;
            this.keyMap[cc.macro.KEY.up]    = false;
            this.keyMap[cc.macro.KEY.w]     = false;

            // Play jump sound
            if (window.AudioManager) {
                window.AudioManager.playSFX('sfxJump');
            }
        }
    },

    // ----------------------------------------------------------------
    //  PHYSICS COLLISION CALLBACKS
    // ----------------------------------------------------------------

    onBeginContact (contact, selfCollider, otherCollider) {
        var otherTag = otherCollider.tag;
        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal; // points from A to B

        // Because the normal direction depends on which fixture is A/B,
        // we need to make sure the normal points away from the player.
        // If selfCollider is fixture B, flip the normal.
        if (selfCollider !== contact.getFixtureA()) {
            normal = cc.v2(-normal.x, -normal.y);
        }

        // ---- GROUND / WALL (tag 1) ----
        if (otherTag === 1) {
            if (normal.y > 0.5) {
                // Landing on top of ground
                this.groundContactCount++;
            } else if (normal.y < -0.5) {
                // Hit a block from below (head bump)
                this.node.emit('hit-block-below', otherCollider.node);
            }
        }

        // ---- BLOCK (tag 4) ----
        if (otherTag === 4) {
            if (normal.y > 0.5) {
                this.groundContactCount++;
            } else if (normal.y < -0.5) {
                // Hit block from below — trigger QuestionBlock / BrickBlock
                var qBlock = otherCollider.node.getComponent('QuestionBlock');
                if (qBlock && typeof qBlock.onHitFromBelow === 'function') {
                    qBlock.onHitFromBelow(this);
                }
                var bBlock = otherCollider.node.getComponent('BrickBlock');
                if (bBlock && typeof bBlock.onHitFromBelow === 'function') {
                    bBlock.onHitFromBelow(this);
                }
            }
        }

        // ---- ENEMY (tag 3) ----
        if (otherTag === 3) {
            var vel = this.rigidBody ? this.rigidBody.linearVelocity : cc.v2(0, 0);

            if (normal.y > 0.5 && vel.y <= 0) {
                // Stomping on enemy (player is above, falling down)
                var enemyCtrl = otherCollider.node.getComponent('Goomba')
                             || otherCollider.node.getComponent('KoopaTroopa')
                             || otherCollider.node.getComponent('PiranhaFlower')
                             || otherCollider.node.getComponent('EnemyBase');
                if (enemyCtrl && typeof enemyCtrl.onStomped === 'function') {
                    enemyCtrl.onStomped(this);
                }

                // Bounce up after stomp
                if (this.rigidBody) {
                    var v = this.rigidBody.linearVelocity;
                    v.y = this.jumpForce * 0.6;
                    this.rigidBody.linearVelocity = v;
                }

                // Play stomp sound
                if (window.AudioManager) {
                    window.AudioManager.playSFX('sfxStomp');
                }
            } else {
                // Touched enemy from side or below — take damage
                this.takeDamage();
            }
        }

        // ---- ITEM (tag 4 sensor) or SENSOR (tag 5) ----
        if (otherTag === 5) {
            // Check for coin pickup
            var coinComp = otherCollider.node.getComponent('Coin');
            if (coinComp && typeof coinComp.collect === 'function') {
                coinComp.collect(this);
            }
            // Check for mushroom
            var mushComp = otherCollider.node.getComponent('Mushroom');
            if (mushComp && typeof mushComp.collect === 'function') {
                mushComp.collect(this);
            }
            // Check for flag pole
            var flagComp = otherCollider.node.getComponent('FlagPole');
            if (flagComp && typeof flagComp.onPlayerTouch === 'function') {
                flagComp.onPlayerTouch(this);
            }
            // Check for death zone
            if (otherCollider.node.name === 'DeathZone') {
                this.die();
            }
        }

        // ---- Mushroom item (tag 4, dynamic body) ----
        if (otherTag === 4 && !otherCollider.sensor) {
            if (normal.y > 0.5) {
                this.groundContactCount++;
            }
            var mushItem = otherCollider.node.getComponent('Mushroom');
            if (mushItem && typeof mushItem.collect === 'function') {
                mushItem.collect(this);
            }
        }
    },

    onEndContact (contact, selfCollider, otherCollider) {
        var otherTag = otherCollider.tag;
        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal;

        if (selfCollider !== contact.getFixtureA()) {
            normal = cc.v2(-normal.x, -normal.y);
        }

        // Ground (tag 1) or block (tag 4)
        if (otherTag === 1 || otherTag === 4) {
            if (normal.y > 0.5) {
                this.groundContactCount--;
                if (this.groundContactCount < 0) this.groundContactCount = 0;
            }
        }
    },

    // ----------------------------------------------------------------
    //  DAMAGE & DEATH
    // ----------------------------------------------------------------

    takeDamage () {
        if (this.isInvincible || this.isDead) return;

        if (this.isBig) {
            // Shrink to small Mario
            this.isBig = false;
            if (this.animator) {
                this.animator.setSize(false);
            }
            this._startInvincibility();

            if (window.AudioManager) {
                window.AudioManager.playSFX('sfxPowerDown');
            }
        } else {
            // Small Mario — die
            this.die();
        }
    },

    die () {
        if (this.isDead) return;
        this.isDead = true;

        // Stop horizontal movement
        if (this.rigidBody) {
            this.rigidBody.linearVelocity = cc.v2(0, 0);
            this.rigidBody.type = cc.RigidBodyType.Static;
        }

        // Set death animation frame
        if (this.animator) {
            this.animator.setState('die');
        }

        // Play death sound
        if (window.AudioManager) {
            window.AudioManager.playSFX('sfxLoseLife');
        }

        // Death "hop" animation — jump up then fall
        var jumpUp   = cc.moveBy(0.3, cc.v2(0, 80)).easing(cc.easeQuadraticActionOut());
        var fallDown = cc.moveBy(0.7, cc.v2(0, -600)).easing(cc.easeQuadraticActionIn());
        var deathSeq = cc.sequence(
            jumpUp,
            fallDown,
            cc.callFunc(function () {
                // Notify GameManager after death animation
                if (window.GameManager && typeof window.GameManager.loseLife === 'function') {
                    window.GameManager.loseLife();
                }
            }, this)
        );
        this.node.runAction(deathSeq);
    },

    // ----------------------------------------------------------------
    //  INVINCIBILITY
    // ----------------------------------------------------------------

    _startInvincibility () {
        this.isInvincible      = true;
        this._invincibleTimer  = 0;
        this._flashTimer       = 0;
    },

    _updateInvincibility (dt) {
        if (!this.isInvincible) return;

        this._invincibleTimer += dt;
        this._flashTimer      += dt;

        // Toggle sprite opacity for flashing effect
        if (this._flashTimer >= this._flashInterval) {
            this._flashTimer = 0;
            this.node.opacity = (this.node.opacity < 255) ? 255 : 100;
        }

        // End invincibility after duration
        if (this._invincibleTimer >= this.invincibleDuration) {
            this.isInvincible     = false;
            this._invincibleTimer = 0;
            this._flashTimer      = 0;
            this.node.opacity     = 255;
        }
    },

    // ----------------------------------------------------------------
    //  POWER-UP
    // ----------------------------------------------------------------

    powerUp () {
        if (this.isDead) return;

        if (!this.isBig) {
            this.isBig = true;

            if (this.animator) {
                this.animator.setSize(true);
            }

            // Animate a brief grow effect
            var originalScaleY = Math.abs(this.node.scaleY);
            this.node.runAction(
                cc.sequence(
                    cc.scaleTo(0.1, this.node.scaleX, originalScaleY * 1.3),
                    cc.scaleTo(0.1, this.node.scaleX, originalScaleY)
                )
            );

            if (window.AudioManager) {
                window.AudioManager.playSFX('sfxPowerUp');
            }
        }
    },

    // ----------------------------------------------------------------
    //  RESPAWN
    // ----------------------------------------------------------------

    respawn (position) {
        var pos = position || this.spawnPoint;

        this.isDead           = false;
        this.isInvincible     = false;
        this.isBig            = false;
        this.groundContactCount = 0;
        this.node.opacity     = 255;

        this.node.setPosition(pos);
        this.node.stopAllActions();

        if (this.rigidBody) {
            this.rigidBody.type = cc.RigidBodyType.Dynamic;
            this.rigidBody.linearVelocity = cc.v2(0, 0);
            this.rigidBody.angularVelocity = 0;
        }

        if (this.animator) {
            this.animator.setSize(false);
            this.animator.setState('idle');
        }
    },

    // ----------------------------------------------------------------
    //  BOUNDS CHECK
    // ----------------------------------------------------------------

    _checkOutOfBounds () {
        if (this.node.y < -300) {
            this.die();
        }
    },

    // ----------------------------------------------------------------
    //  ANIMATION STATE HELPER
    // ----------------------------------------------------------------

    _updateAnimatorState () {
        if (!this.animator) return;

        var vel = this.rigidBody ? this.rigidBody.linearVelocity : cc.v2(0, 0);

        if (this.groundContactCount <= 0) {
            this.animator.setState('jump');
        } else if (Math.abs(vel.x) > 10) {
            // Detect sliding (moving one way but facing the other)
            var slidingLeft  = vel.x > 10 && !this.facingRight;
            var slidingRight = vel.x < -10 && this.facingRight;
            if (slidingLeft || slidingRight) {
                this.animator.setState('slide');
            } else {
                this.animator.setState('walk');
            }
        } else {
            this.animator.setState('idle');
        }
    },

    // ----------------------------------------------------------------
    //  CLEANUP
    // ----------------------------------------------------------------

    onDestroy () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
    },
});
