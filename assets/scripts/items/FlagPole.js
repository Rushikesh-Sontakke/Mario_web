// FlagPole.js
// End-of-level flagpole.
// On player contact: flag descends, score awarded based on height,
// player walks off-screen, level clear sound plays, then level ends.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Reference to the flag sprite node (child of the pole) */
        flagNode: {
            default: null,
            type: cc.Node,
        },
    },

    onLoad () {
        this._isTriggered = false;

        // Cache pole dimensions for score calculation
        // Pole top/bottom Y in local space
        this._poleTopY = this.node.height / 2;
        this._poleBottomY = -this.node.height / 2;
    },

    // ─────────────────────────────────────────────
    // Physics — sensor trigger
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this._isTriggered) return;

        var playerComp = otherCollider.node.getComponent('PlayerController');
        if (!playerComp) return;

        this._isTriggered = true;
        this._onPlayerReachedFlag(playerComp, otherCollider.node);
    },

    // ─────────────────────────────────────────────
    // Flag sequence
    // ─────────────────────────────────────────────

    _onPlayerReachedFlag (playerComp, playerNode) {
        // ── 1. Disable player input ──
        if (typeof playerComp.disableInput === 'function') {
            playerComp.disableInput();
        } else {
            // Fallback: set a flag the PlayerController can check
            playerComp.inputEnabled = false;
        }

        // Stop player physics movement
        var playerRB = playerNode.getComponent(cc.RigidBody);
        if (playerRB) {
            playerRB.linearVelocity = cc.v2(0, 0);
            playerRB.type = cc.RigidBodyType.Static;
        }

        // ── 2. Calculate score based on player height on the pole ──
        // Convert player Y to pole's local space
        var poleWorldPos = this.node.parent.convertToWorldSpaceAR(this.node.position);
        var playerWorldPos = playerNode.parent.convertToWorldSpaceAR(playerNode.position);
        var relativeY = playerWorldPos.y - poleWorldPos.y;

        // Normalize: 0 (bottom) → 1 (top)
        var poleHeight = this.node.height || 128;
        var ratio = (relativeY - this._poleBottomY) / (this._poleTopY - this._poleBottomY);
        ratio = Math.max(0, Math.min(1, ratio));

        var score = Math.round(ratio * 5000);
        // Round to nearest 100
        score = Math.round(score / 100) * 100;
        if (score < 100) score = 100;

        this._addScore(score);

        // ── 3. Animate flag descending ──
        var flagDuration = 1.0;
        if (this.flagNode) {
            var flagTargetY = this._poleBottomY + 8; // just above ground
            cc.tween(this.flagNode)
                .to(flagDuration, { y: flagTargetY })
                .start();
        }

        // ── 4. After flag reaches bottom: animate player walking right ──
        var self = this;
        this.scheduleOnce(function () {
            // Re-enable player RB as kinematic to allow tween
            if (playerRB) {
                playerRB.type = cc.RigidBodyType.Kinematic;
                playerRB.linearVelocity = cc.v2(0, 0);
            }

            // Flip player to face right
            playerNode.scaleX = Math.abs(playerNode.scaleX);

            // Walk off-screen to the right
            cc.tween(playerNode)
                .by(2.0, { x: 200 })
                .start();
        }, flagDuration + 0.2);

        // ── 5. Play level clear sound ──
        this._playSound('levelClear');

        // ── 6. After 3s, call GameManager.levelClear() ──
        this.scheduleOnce(function () {
            self._levelClear();
        }, 3.0);
    },

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    _levelClear () {
        var gm = cc.find('Canvas/GameManager') || cc.find('GameManager');
        if (gm) {
            var gmComp = gm.getComponent('GameManager');
            if (gmComp && typeof gmComp.levelClear === 'function') {
                gmComp.levelClear();
                return;
            }
        }
        if (window.GameManager && typeof window.GameManager.levelClear === 'function') {
            window.GameManager.levelClear();
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
