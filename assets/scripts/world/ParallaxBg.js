// ParallaxBg.js
// Parallax scrolling background for the game world.
// Creates sky, cloud, and hill layers programmatically and scrolls them
// at different speeds relative to the camera position for a depth effect.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Reference to the camera node so we can read its position */
        cameraNode: {
            default: null,
            type: cc.Node,
        },

        /** How fast the farthest background layer moves relative to camera (0 = static, 1 = same speed) */
        parallaxRatio: 0.3,
    },

    onLoad: function () {
        // Store initial camera X so we can compute deltas
        this._lastCamX = 0;

        // Layer containers
        this._skyNode = null;
        this._cloudNodes = [];
        this._hillNodes = [];

        // Build all background layers
        this._createSkyLayer();
        this._createCloudLayer();
        this._createHillLayer();
    },

    // ─── Sky Layer (solid color, fills the entire visible area) ───────────────
    _createSkyLayer: function () {
        var sky = new cc.Node('Sky');
        sky.parent = this.node;
        sky.setContentSize(1920, 640); // double canvas width for safety
        sky.setPosition(480, 320);
        sky.zIndex = -10;

        var sprite = sky.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.type = cc.Sprite.Type.FILLED;

        // We don't have a dedicated sky texture, so use a solid-color approach:
        // create a tiny white spriteframe and tint the node.
        sky.color = new cc.Color(107, 140, 255); // classic SMB sky blue

        // Use a Graphics component to draw a filled rectangle as fallback
        sky.removeComponent(cc.Sprite);
        var gfx = sky.addComponent(cc.Graphics);
        gfx.fillColor = new cc.Color(107, 140, 255);
        gfx.rect(-960, -320, 1920, 640);
        gfx.fill();

        this._skyNode = sky;
    },

    // ─── Cloud Layer ─────────────────────────────────────────────────────────
    _createCloudLayer: function () {
        // Create several simple cloud sprites spread across the level
        var cloudCount = 12;
        var spacing = 600;

        for (var i = 0; i < cloudCount; i++) {
            var cloud = new cc.Node('Cloud_' + i);
            cloud.parent = this.node;
            cloud.zIndex = -8;

            // Draw a simple elliptical cloud shape using Graphics
            var gfx = cloud.addComponent(cc.Graphics);
            gfx.fillColor = new cc.Color(255, 255, 255, 200);

            // Main body
            gfx.ellipse(0, 0, 50 + Math.random() * 30, 18 + Math.random() * 10);
            gfx.fill();
            // Bumps on top
            gfx.ellipse(-20, 12, 22, 14);
            gfx.fill();
            gfx.ellipse(15, 14, 26, 16);
            gfx.fill();

            // Position clouds spread across the level at varying heights
            var px = i * spacing + Math.random() * 200;
            var py = 420 + Math.random() * 160; // upper portion of the screen
            cloud.setPosition(px, py);
            cloud.setScale(0.8 + Math.random() * 0.6);

            this._cloudNodes.push({
                node: cloud,
                originX: px,
                ratio: 0.15 + Math.random() * 0.15, // clouds move very slowly
            });
        }
    },

    // ─── Hill / Bush Decoration Layer ────────────────────────────────────────
    _createHillLayer: function () {
        var hillCount = 8;
        var spacing = 900;

        for (var i = 0; i < hillCount; i++) {
            var hill = new cc.Node('Hill_' + i);
            hill.parent = this.node;
            hill.zIndex = -5;

            var gfx = hill.addComponent(cc.Graphics);

            // Alternate between hill and bush
            if (i % 2 === 0) {
                // Hill — a rounded triangle
                var hw = 80 + Math.random() * 60;
                var hh = 50 + Math.random() * 40;
                gfx.fillColor = new cc.Color(0, 170, 68, 180);
                gfx.moveTo(-hw, 0);
                gfx.bezierCurveTo(-hw * 0.5, hh * 2, hw * 0.5, hh * 2, hw, 0);
                gfx.lineTo(-hw, 0);
                gfx.fill();
            } else {
                // Bush — short wide ellipse
                gfx.fillColor = new cc.Color(34, 139, 34, 180);
                gfx.ellipse(0, 12, 55 + Math.random() * 30, 20 + Math.random() * 10);
                gfx.fill();
            }

            var px = i * spacing + Math.random() * 200;
            var py = 95 + Math.random() * 20; // just above the ground line
            hill.setPosition(px, py);

            this._hillNodes.push({
                node: hill,
                originX: px,
                ratio: this.parallaxRatio + 0.15, // hills move a bit faster than clouds
            });
        }
    },

    // ─── Update: offset layers based on camera position ──────────────────────
    update: function (dt) {
        if (!this.cameraNode) return;

        var camX = this.cameraNode.x;

        // Move sky to always center on the camera (it's a big solid fill)
        if (this._skyNode) {
            this._skyNode.x = camX;
        }

        // Parallax offset for clouds
        var i, item;
        for (i = 0; i < this._cloudNodes.length; i++) {
            item = this._cloudNodes[i];
            item.node.x = item.originX - camX * item.ratio;
        }

        // Parallax offset for hills
        for (i = 0; i < this._hillNodes.length; i++) {
            item = this._hillNodes[i];
            item.node.x = item.originX - camX * item.ratio;
        }
    },
});
