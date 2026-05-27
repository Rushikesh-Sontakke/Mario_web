// PlayerAnimator.js
// Manages Mario sprite animation by swapping sprite frames from plist atlases.
// Attach to the same node as PlayerController & cc.Sprite.

cc.Class({
    extends: cc.Component,

    properties: {
        sprite: {
            default: null,
            type: cc.Sprite,
            tooltip: 'Reference to the player Sprite component',
        },
        smallAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'SpriteAtlas for small Mario (mario_small plist)',
        },
        bigAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'SpriteAtlas for big Mario (mario_big plist)',
        },
        frameRate: {
            default: 0.1,
            tooltip: 'Seconds per animation frame',
        },
    },

    onLoad () {
        // ---- state ----
        this.currentState = 'idle';
        this.frameIndex   = 0;
        this.animTimer    = 0;
        this.isBig        = false;

        // If no sprite reference was set in the inspector, grab it from the node
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite);
        }

        // ---- frame name definitions ----
        // Each key maps an animation state to an array of frame names inside the
        // corresponding atlas.
        this.smallFrames = {
            idle:  ['mario_small_0'],
            walk:  ['mario_small_1', 'mario_small_2', 'mario_small_3'],
            jump:  ['mario_small_4'],
            slide: ['mario_small_5'],
            die:   ['mario_small_6'],
        };

        this.bigFrames = {
            idle:   ['mario_big_0'],
            walk:   ['mario_big_1', 'mario_big_2', 'mario_big_3'],
            jump:   ['mario_big_5'],
            crouch: ['mario_big_6'],
            // Big Mario shares some states with small; provide sensible fallbacks
            slide:  ['mario_big_5'],   // reuse jump frame as slide
            die:    ['mario_big_0'],   // no specific die frame for big mario
        };
    },

    // ----------------------------------------------------------------
    //  PUBLIC API
    // ----------------------------------------------------------------

    /**
     * Change the current animation state.
     * Resets frame index and timer so the new animation starts from frame 0.
     */
    setState (newState) {
        if (newState === this.currentState) return;

        this.currentState = newState;
        this.frameIndex   = 0;
        this.animTimer    = 0;

        // Immediately show the first frame of the new state
        this._applyFrame();
    },

    /**
     * Switch between small and big Mario frame sets.
     * @param {boolean} big  true = big Mario, false = small Mario
     */
    setSize (big) {
        this.isBig = big;
        this.frameIndex = 0;
        this.animTimer  = 0;
        this._applyFrame();
    },

    /**
     * Return the array of frame names for the current state and size.
     */
    getCurrentFrames () {
        var frameMap = this.isBig ? this.bigFrames : this.smallFrames;
        var frames   = frameMap[this.currentState];

        if (!frames) {
            // Fallback to idle if the state doesn't exist in this size
            frames = frameMap['idle'];
        }
        return frames;
    },

    // ----------------------------------------------------------------
    //  UPDATE LOOP
    // ----------------------------------------------------------------

    update (dt) {
        this.updateAnimation(dt);
    },

    /**
     * Advance the frame timer and cycle through the current animation frames.
     */
    updateAnimation (dt) {
        var frames = this.getCurrentFrames();
        if (!frames || frames.length === 0) return;

        // Single-frame states don't need cycling
        if (frames.length === 1) {
            // Make sure the frame is applied (it already is from setState,
            // but just in case the atlas was loaded late)
            if (this.frameIndex !== 0) {
                this.frameIndex = 0;
                this._applyFrame();
            }
            return;
        }

        this.animTimer += dt;

        if (this.animTimer >= this.frameRate) {
            this.animTimer -= this.frameRate;
            this.frameIndex = (this.frameIndex + 1) % frames.length;
            this._applyFrame();
        }
    },

    // ----------------------------------------------------------------
    //  INTERNAL
    // ----------------------------------------------------------------

    /**
     * Set the sprite's spriteFrame from the current atlas based on
     * frameIndex and animation state.
     */
    _applyFrame () {
        if (!this.sprite) return;

        var frames = this.getCurrentFrames();
        if (!frames || frames.length === 0) return;

        var frameName = frames[this.frameIndex];
        var atlas     = this.isBig ? this.bigAtlas : this.smallAtlas;

        if (!atlas) {
            // Atlas not assigned — nothing we can do
            cc.warn('[PlayerAnimator] No atlas assigned for ' + (this.isBig ? 'big' : 'small') + ' Mario.');
            return;
        }

        var spriteFrame = atlas.getSpriteFrame(frameName);

        if (spriteFrame) {
            this.sprite.spriteFrame = spriteFrame;
        } else {
            cc.warn('[PlayerAnimator] Frame "' + frameName + '" not found in atlas.');
        }
    },
});
