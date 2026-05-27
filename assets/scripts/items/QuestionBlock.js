// QuestionBlock.js
// Animated ? block that spawns items when the player hits it from below.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Items sprite atlas — contains items_0 … items_27+ frames */
        itemsAtlas: {
            default: null,
            type: cc.SpriteAtlas,
        },
        /** What this block contains: 'coin', 'mushroom', or 'fireflower' */
        contentType: 'coin',
        /** Has this block been hit already? */
        isHit: false,
        /** Internal animation timer */
        animTimer: 0,
    },

    onLoad () {
        this._sprite = this.getComponent(cc.Sprite);

        // Question-mark animation frames
        this._questionFrames = ['items_24', 'items_25', 'items_26'];
        this._frameIndex = 0;
        this._animInterval = 0.15; // seconds between frames

        // Store original Y for bump animation
        this._originalY = this.node.y;
        this._isBumping = false;
    },

    start () {
        this._applyFrame(this._questionFrames[0]);
    },

    update (dt) {
        if (this.isHit) return;

        // Cycle through question-mark frames
        this.animTimer += dt;
        if (this.animTimer >= this._animInterval) {
            this.animTimer -= this._animInterval;
            this._frameIndex = (this._frameIndex + 1) % this._questionFrames.length;
            this._applyFrame(this._questionFrames[this._frameIndex]);
        }
    },

    // ─────────────────────────────────────────────
    // Physics — detect hit from below
    // ─────────────────────────────────────────────

    onBeginContact (contact, selfCollider, otherCollider) {
        if (this.isHit) return;

        var playerComp = otherCollider.node.getComponent('PlayerController');
        if (!playerComp) return;

        var worldManifold = contact.getWorldManifold();
        var normal = worldManifold.normal;

        // Determine normal relative to self (the block)
        var selfIsA = (contact.colliderA === selfCollider);
        var ny = selfIsA ? normal.y : -normal.y;

        // Player hitting from below means the normal from the block's
        // perspective points downward (toward the player below).
        if (ny < -0.5) {
            this._onHitFromBelow(playerComp);
        }
    },

    // ─────────────────────────────────────────────
    // Hit logic
    // ─────────────────────────────────────────────

    _onHitFromBelow (playerComp) {
        if (this.isHit || this._isBumping) return;
        this.isHit = true;

        // Switch to empty block frame
        this._applyFrame('items_27');

        // Bump animation
        this._doBumpAnimation();

        // Spawn content
        switch (this.contentType) {
            case 'coin':
                this._spawnCoin();
                break;
            case 'mushroom':
                this._spawnMushroom();
                break;
            case 'fireflower':
                this._spawnMushroom(); // Fire flower uses same spawn style
                break;
        }
    },

    /**
     * Bump the block upward 8px and back down over 0.2s.
     */
    _doBumpAnimation () {
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
    },

    // ─────────────────────────────────────────────
    // Content spawners
    // ─────────────────────────────────────────────

    /**
     * Spawn an animated coin that flies upward and disappears.
     */
    _spawnCoin () {
        // Create coin node
        var coinNode = new cc.Node('BlockCoin');
        var sprite = coinNode.addComponent(cc.Sprite);

        // Use coin frame from atlas
        if (this.itemsAtlas) {
            var frame = this.itemsAtlas.getSpriteFrame('items_6');
            if (frame) sprite.spriteFrame = frame;
        }

        // Position above block
        coinNode.parent = this.node.parent;
        coinNode.x = this.node.x;
        coinNode.y = this.node.y + this.node.height;

        // Animate upward then destroy
        cc.tween(coinNode)
            .to(0.3, { y: coinNode.y + 48 })
            .to(0.2, { opacity: 0 })
            .call(function () {
                coinNode.destroy();
            })
            .start();

        // Add score + coin count
        this._addScore(200);
        this._addCoin(1);

        // Play coin sound
        this._playSound('coin');
    },

    /**
     * Spawn a mushroom that rises from the block and starts moving.
     */
    _spawnMushroom () {
        var mushroomNode = new cc.Node('Mushroom');
        var sprite = mushroomNode.addComponent(cc.Sprite);

        // Mushroom frame
        if (this.itemsAtlas) {
            var frame = this.itemsAtlas.getSpriteFrame('items_0');
            if (frame) sprite.spriteFrame = frame;
        }

        // Position inside the block (will rise up)
        mushroomNode.parent = this.node.parent;
        mushroomNode.x = this.node.x;
        mushroomNode.y = this.node.y;

        // Add Mushroom component (handles physics + movement after rise)
        var mushroomComp = mushroomNode.addComponent('Mushroom');
        if (mushroomComp) {
            mushroomComp.itemsAtlas = this.itemsAtlas;
        }

        // Play powerup appear sound
        this._playSound('powerUpAppear');
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
