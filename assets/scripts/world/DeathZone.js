// DeathZone.js
// Invisible death trigger positioned below the visible screen.
// When the player falls out of bounds, this sensor detects the collision
// and calls the player's die() method.
//
// Attach to a node that already has (or will be given) a PhysicsBoxCollider.
// The script also programmatically adds the collider if one is not present,
// making it safe to use on a bare cc.Node.

cc.Class({
    extends: cc.Component,

    properties: {
        /** Width of the death zone — should span the entire level */
        zoneWidth: 10000,

        /** Height of the death zone trigger */
        zoneHeight: 50,

        /** Y position of the zone center (negative = below visible screen) */
        zoneY: -400,
    },

    onLoad: function () {
        // Position the node
        this.node.y = this.zoneY;
        this.node.x = this.zoneWidth / 2; // center it so it covers 0..zoneWidth

        // ── RigidBody (required for physics colliders) ──
        var rb = this.node.getComponent(cc.RigidBody);
        if (!rb) {
            rb = this.node.addComponent(cc.RigidBody);
        }
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        // ── PhysicsBoxCollider (sensor) ──
        var collider = this.node.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.node.addComponent(cc.PhysicsBoxCollider);
        }
        collider.size = cc.size(this.zoneWidth, this.zoneHeight);
        collider.offset = cc.v2(0, 0);
        collider.sensor = true;
        // Group 5 = sensor (see project collision group settings)
        this.node.group = 'sensor';

        collider.apply();
    },

    /**
     * Physics collision callback — fires when any body enters this sensor.
     * We check if the other body belongs to the player and trigger death.
     */
    onBeginContact: function (contact, selfCollider, otherCollider) {
        var otherNode = otherCollider.node;

        // Check if the colliding node is the player (by group name or component)
        if (otherNode.group === 'player') {
            this._killPlayer(otherNode);
            return;
        }

        // Fallback: try to find a PlayerController component
        var playerCtrl = otherNode.getComponent('PlayerController');
        if (playerCtrl) {
            this._killPlayer(otherNode);
            return;
        }

        // If an enemy or item falls off, just destroy it silently
        if (otherNode.group === 'enemy' || otherNode.group === 'item') {
            otherNode.destroy();
        }
    },

    /**
     * Handle killing the player.
     */
    _killPlayer: function (playerNode) {
        var ctrl = playerNode.getComponent('PlayerController');
        if (ctrl && typeof ctrl.die === 'function') {
            ctrl.die();
        } else {
            // Fallback: emit event that GameScene can listen for
            cc.log('[DeathZone] Player fell out of bounds');
            this.node.emit('player-fell');
            // Also try a global event
            if (window.GameManager && typeof window.GameManager.onPlayerDied === 'function') {
                window.GameManager.onPlayerDied();
            }
        }
    },
});
