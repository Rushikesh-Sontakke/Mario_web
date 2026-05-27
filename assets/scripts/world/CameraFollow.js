// CameraFollow.js
// Camera controller that smoothly follows the player.
// Attach this script to the Camera node that has a cc.Camera component.
// The camera only scrolls RIGHT (never scrolls back left), mimicking classic Mario behavior.

cc.Class({
    extends: cc.Component,

    properties: {
        /** The player node to follow */
        target: {
            default: null,
            type: cc.Node,
        },

        /** Lerp smoothing speed — higher = snappier tracking */
        smoothSpeed: 5.0,

        /** Total level width in pixels */
        levelWidth: 6400,

        /** Total level height in pixels */
        levelHeight: 640,

        /** Camera leads the player horizontally by this many pixels */
        offsetX: 100,
    },

    onLoad: function () {
        // Canvas half-dimensions used for clamping
        this._canvasHalfW = 480;  // 960 / 2
        this._canvasHalfH = 320;  // 640 / 2

        // The furthest-right position the camera has reached (never scroll back)
        this._maxCameraX = this._canvasHalfW;

        // Cache the cc.Camera component on this node (if present)
        this._cameraComp = this.node.getComponent(cc.Camera);
    },

    /**
     * Reset camera tracking — call when restarting a level or repositioning the player.
     */
    resetCamera: function () {
        this._maxCameraX = this._canvasHalfW;
        if (this.target) {
            this.node.x = Math.max(this._canvasHalfW, this.target.x + this.offsetX);
            this.node.y = this._canvasHalfH;
        }
    },

    /**
     * Allow external code to update level dimensions at runtime
     * (e.g. when LevelBuilder calculates the actual level size).
     */
    setLevelSize: function (width, height) {
        this.levelWidth = width;
        this.levelHeight = height;
    },

    update: function (dt) {
        if (!this.target) return;

        // ---- Horizontal tracking ----
        var desiredX = this.target.x + this.offsetX;

        // Never scroll left — ratchet the minimum
        if (desiredX > this._maxCameraX) {
            this._maxCameraX = desiredX;
        }
        desiredX = this._maxCameraX;

        // Clamp to level boundaries so we never show outside the map
        var minX = this._canvasHalfW;
        var maxX = this.levelWidth - this._canvasHalfW;
        if (maxX < minX) maxX = minX; // safety for very small levels
        desiredX = Math.max(minX, Math.min(desiredX, maxX));

        // Smooth lerp toward the desired position
        var lerpFactor = 1.0 - Math.exp(-this.smoothSpeed * dt);
        this.node.x = this.node.x + (desiredX - this.node.x) * lerpFactor;

        // ---- Vertical tracking ----
        // Classic Mario has a mostly fixed vertical camera.
        // We allow slight vertical follow clamped to level bounds.
        var desiredY = this._canvasHalfH; // default: center of screen

        // Optional: follow player vertically when they jump high
        if (this.target.y > this._canvasHalfH) {
            desiredY = this.target.y;
        }

        var minY = this._canvasHalfH;
        var maxY = this.levelHeight - this._canvasHalfH;
        if (maxY < minY) maxY = minY;
        desiredY = Math.max(minY, Math.min(desiredY, maxY));

        this.node.y = this.node.y + (desiredY - this.node.y) * lerpFactor;
    },
});
