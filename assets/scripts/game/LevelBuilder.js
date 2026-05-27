// ---------------------------------------------------------------------------
// LevelBuilder.js — Programmatic level constructor for Mario platformer
// Reads level data and spawns every node: ground, blocks, pipes, enemies,
// player, HUD, death-zone, camera, and background decorations.
//
// Grid system:
//   • Tile sprites are 16 × 16 px; SCALE = 2.5  ⇒  cell = 40 × 40 px
//   • Position helper:  x = col * CELL + HALF,  y = row * CELL + HALF
//   • Level 1-1: 212 columns × 15 rows  ⇒  8480 × 600 px world
//
// Collider tags used for physics identification:
//   0 = default,  1 = ground/wall,  2 = player,
//   3 = enemy,    4 = item/block,   5 = sensor (death zone, flagpole, coin)
// ---------------------------------------------------------------------------

var CELL = 40;                       // pixels per grid cell (16 * 2.5)
var HALF = CELL / 2;                 // 20 – centre offset
var SCALE = 2.5;                     // sprite render scale
var SKY_COLOR = new cc.Color(107, 140, 255);   // classic Mario sky blue

// ===========================  LEVEL 1-1 DATA  ==============================
var LEVEL_1_1 = {
    width: 212,
    height: 15,
    playerSpawn: { col: 3, row: 2 },
    flagPole: { col: 198, row: 2 },

    // Ground segments: [startCol, endCol] — rows 0 & 1
    ground: [
        [0, 68],
        [71, 86],
        [89, 152],
        [155, 212]
    ],

    // Pipes: [col, row, heightInTiles]  (each pipe is 2 tiles wide)
    pipes: [
        [28, 2, 2],
        [38, 2, 3],
        [46, 2, 4],
        [57, 2, 4],
        [163, 2, 2],
        [179, 2, 2]
    ],

    // Question blocks: [col, row, content]
    questionBlocks: [
        [16, 5, 'coin'],
        [20, 5, 'coin'],
        [21, 5, 'mushroom'],
        [22, 5, 'coin'],
        [23, 9, 'coin'],
        [78, 5, 'mushroom'],
        [94, 9, 'coin'],
        [106, 5, 'coin'],
        [109, 5, 'coin'],
        [109, 9, 'coin'],
        [112, 5, 'coin'],
        [129, 9, 'mushroom'],
        [170, 5, 'coin']
    ],

    // Brick blocks: [col, row]
    bricks: [
        [20, 5], [21, 5], [24, 5],
        [77, 5], [79, 5],
        [80, 9], [81, 9], [82, 9], [83, 9], [84, 9], [85, 9], [86, 9], [87, 9],
        [91, 9], [92, 9], [93, 9],
        [94, 5],
        [100, 9], [101, 9],
        [106, 9], [107, 9], [108, 9],
        [118, 5], [119, 5], [120, 5],
        [128, 9], [129, 9], [130, 9],
        [168, 5], [169, 5], [171, 5]
    ],

    // Staircases: { col, row, steps, direction }
    //   direction  1 = ascending to the right,  -1 = descending to the right
    stairs: [
        { col: 134, row: 2, steps: 4, direction: 1 },
        { col: 140, row: 2, steps: 4, direction: -1 },
        { col: 148, row: 2, steps: 4, direction: 1 },
        { col: 152, row: 2, steps: 5, direction: -1 },
        { col: 181, row: 2, steps: 8, direction: 1 }
    ],

    // Enemies: [col, row, type]
    enemies: [
        [22, 2, 'goomba'],
        [40, 2, 'goomba'],
        [51, 2, 'goomba'],
        [52, 2, 'goomba'],
        [80, 10, 'goomba'],
        [82, 10, 'goomba'],
        [97, 2, 'goomba'],
        [98, 2, 'goomba'],
        [107, 2, 'koopa'],
        [114, 2, 'goomba'],
        [115, 2, 'goomba'],
        [124, 2, 'goomba'],
        [125, 2, 'goomba'],
        [128, 2, 'goomba'],
        [129, 2, 'goomba'],
        [174, 2, 'goomba'],
        [175, 2, 'goomba']
    ],

    // Floating coins: [col, row]
    coins: [
        [81, 6], [82, 6], [83, 6], [84, 6],
        [91, 6], [92, 6], [93, 6],
        [101, 6]
    ]
};

// ===========================================================================
// LevelBuilder component
// ===========================================================================
cc.Class({
    extends: cc.Component,

    properties: {
        // ---------- Sprite atlases (assign in Cocos Creator inspector) ------
        itemsAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'items.plist atlas — blocks, coins, pipes, mushroom'
        },
        playerSmallAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'mario_small.plist atlas'
        },
        playerBigAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'mario_big.plist atlas'
        },
        goombaAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'Goomba.plist atlas'
        },
        turtleAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'Turtle.plist atlas'
        },
        flowerAtlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: 'Flower.plist atlas'
        },

        // ---------- Parent node for all spawned game objects -----------------
        gameLayer: {
            default: null,
            type: cc.Node,
            tooltip: 'Parent node that holds every spawned level element'
        },

        // ---------- Audio clips (optional, wired in inspector) --------------
        bgmClip: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Background music clip (bgm_1.mp3)'
        },
        coinClip: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Coin pickup SFX'
        },
        jumpClip: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Jump SFX'
        },
        stompClip: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Stomp SFX'
        },
        powerUpClip: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Power-up SFX'
        },
        levelClearClip: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Level clear SFX'
        }
    },

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------
    onLoad: function () {
        // Enable physics
        var physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -960);

        // Optionally show debug draw (uncomment for testing)
        // physicsManager.debugDrawFlags =
        //     cc.PhysicsManager.DrawBits.e_aabbBit |
        //     cc.PhysicsManager.DrawBits.e_shapeBit;

        // Keep references accessible globally
        window.LevelBuilder = this;

        // Build the level
        this.buildLevel(LEVEL_1_1);
    },

    // -----------------------------------------------------------------------
    // MAIN BUILD METHOD
    // -----------------------------------------------------------------------
    buildLevel: function (data) {
        this._levelData = data;
        this._levelWidth = data.width * CELL;   // total world width in px
        this._levelHeight = data.height * CELL;  // total world height in px

        // 1. Background sky & decorations
        this.createBackground();

        // 2. Ground
        this._createAllGround(data.ground);

        // 3. Pipes
        for (var p = 0; p < data.pipes.length; p++) {
            var pipe = data.pipes[p];
            this.createPipe(pipe[0], pipe[1], pipe[2]);
        }

        // 4. Question blocks
        for (var q = 0; q < data.questionBlocks.length; q++) {
            var qb = data.questionBlocks[q];
            this.createQuestionBlock(qb[0], qb[1], qb[2]);
        }

        // 5. Brick blocks
        for (var b = 0; b < data.bricks.length; b++) {
            var br = data.bricks[b];
            this.createBrickBlock(br[0], br[1]);
        }

        // 6. Staircases
        this._createAllStairs(data.stairs);

        // 7. Coins
        for (var c = 0; c < data.coins.length; c++) {
            var cn = data.coins[c];
            this.createCoin(cn[0], cn[1]);
        }

        // 8. Enemies
        for (var e = 0; e < data.enemies.length; e++) {
            var en = data.enemies[e];
            if (en[2] === 'goomba') {
                this.createGoomba(en[0], en[1]);
            } else if (en[2] === 'koopa') {
                this.createKoopa(en[0], en[1]);
            }
        }

        // 9. Player
        this._playerNode = this.createPlayer(data.playerSpawn.col, data.playerSpawn.row);

        // 10. Flagpole
        this.createFlagPole(data.flagPole.col, data.flagPole.row);

        // 11. Death zone (bottomless pit trigger)
        this.createDeathZone();

        // 12. HUD
        this.createHUD();

        // 13. Camera
        this.createCamera();

        // 14. Start music
        if (this.bgmClip) {
            cc.audioEngine.playMusic(this.bgmClip, true);
        }
    },

    // =======================================================================
    //  HELPER: grid → pixel position
    // =======================================================================
    _gridPos: function (col, row) {
        return cc.v2(col * CELL + HALF, row * CELL + HALF);
    },

    // Helper: get sprite frame from items atlas (appends ".png" suffix)
    _itemsFrame: function (name) {
        if (!this.itemsAtlas) {
            cc.warn('LevelBuilder: itemsAtlas not assigned!');
            return null;
        }
        // Try with .png suffix first, then without
        var frame = this.itemsAtlas.getSpriteFrame(name + '.png');
        if (!frame) {
            frame = this.itemsAtlas.getSpriteFrame(name);
        }
        if (!frame) {
            cc.warn('LevelBuilder: sprite frame "' + name + '" not found in items atlas');
        }
        return frame;
    },

    // =======================================================================
    //  GROUND
    // =======================================================================
    _createAllGround: function (segments) {
        for (var s = 0; s < segments.length; s++) {
            var start = segments[s][0];
            var end   = segments[s][1];
            // Build a single wide static body per segment for row 0 and row 1
            for (var row = 0; row <= 1; row++) {
                this._createGroundStrip(start, end, row);
            }
        }
    },

    /**
     * Creates one long static-body strip of ground across [startCol..endCol]
     * at the given row.  Individual sprite tiles are added as child nodes so
     * we don't need hundreds of separate physics bodies.
     */
    _createGroundStrip: function (startCol, endCol, row) {
        var cols = endCol - startCol + 1;
        var stripWidth  = cols * CELL;
        var stripHeight = CELL;

        // Parent node with physics body
        var strip = new cc.Node('GroundStrip_' + startCol + '_' + endCol + '_r' + row);
        strip.setContentSize(stripWidth, stripHeight);
        strip.setAnchorPoint(0, 0);
        strip.setPosition(startCol * CELL, row * CELL);

        // Static rigid body
        var rb = strip.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        // One big box collider for the entire strip
        var collider = strip.addComponent(cc.PhysicsBoxCollider);
        collider.offset = cc.v2(stripWidth / 2, stripHeight / 2);
        collider.size = cc.size(stripWidth, stripHeight);
        collider.friction = 0.5;
        collider.tag = 1; // ground

        // Visual tiles — add individual sprite children
        for (var c = 0; c < cols; c++) {
            var tile = new cc.Node('g_' + (startCol + c));
            var sp = tile.addComponent(cc.Sprite);
            sp.spriteFrame = this._itemsFrame('items_28');
            sp.sizeMode = cc.Sprite.SizeMode.RAW;
            tile.setScale(SCALE);
            tile.setAnchorPoint(0.5, 0.5);
            tile.setPosition(c * CELL + HALF, HALF);
            tile.parent = strip;
        }

        strip.parent = this.gameLayer;
        return strip;
    },

    // =======================================================================
    //  SINGLE GROUND / STONE BLOCK (used by stairs)
    // =======================================================================
    createGround: function (col, row) {
        var node = new cc.Node('Ground_' + col + '_' + row);
        var sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = this._itemsFrame('items_43'); // stone block
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);

        var pos = this._gridPos(col, row);
        node.setPosition(pos);

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(16, 16);
        collider.friction = 0.5;
        collider.tag = 1; // ground

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  BRICK BLOCK (breakable)
    // =======================================================================
    createBrickBlock: function (col, row) {
        var node = new cc.Node('Brick_' + col + '_' + row);
        var sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = this._itemsFrame('items_19');
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);
        node.setPosition(this._gridPos(col, row));

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(16, 16);
        collider.friction = 0.4;
        collider.tag = 4; // block

        // Game logic component (will be defined in its own script)
        var brickComp = node.addComponent('BrickBlock');
        if (brickComp) {
            brickComp.itemsAtlas = this.itemsAtlas;
        }

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  QUESTION BLOCK
    // =======================================================================
    createQuestionBlock: function (col, row, content) {
        var node = new cc.Node('QBlock_' + col + '_' + row);
        var sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = this._itemsFrame('items_24');
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);
        node.setPosition(this._gridPos(col, row));

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(16, 16);
        collider.friction = 0.4;
        collider.tag = 4; // block

        // Animate the question mark shimmer (frames 24, 25, 26)
        var animFrames = [];
        for (var i = 24; i <= 26; i++) {
            var f = this._itemsFrame('items_' + i);
            if (f) animFrames.push(f);
        }
        if (animFrames.length === 3) {
            var qbAnim = node.addComponent('QuestionBlockAnim');
            if (qbAnim) {
                qbAnim.frames = animFrames;
            } else {
                // Inline simple animation via schedule if script missing
                var frameIdx = 0;
                var sprite = sp;
                var allFrames = animFrames;
                node._qbInterval = setInterval(function () {
                    frameIdx = (frameIdx + 1) % allFrames.length;
                    sprite.spriteFrame = allFrames[frameIdx];
                }, 200);
                node.on('destroyed', function () { clearInterval(node._qbInterval); });
            }
        }

        // Game logic component
        var qComp = node.addComponent('QuestionBlock');
        if (qComp) {
            qComp.content = content;          // 'coin' or 'mushroom'
            qComp.itemsAtlas = this.itemsAtlas;
            qComp.emptyFrame = this._itemsFrame('items_27');
            qComp.coinClip = this.coinClip;
            qComp.powerUpClip = this.powerUpClip;
        }

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  PIPE (2 tiles wide, variable height)
    // =======================================================================
    createPipe: function (col, row, heightInTiles) {
        // Pipe occupies columns [col, col+1] and rows [row .. row+heightInTiles-1]
        var pipeNode = new cc.Node('Pipe_' + col + '_' + row);
        var pipeWidth  = 2 * CELL;
        var pipeHeight = heightInTiles * CELL;
        pipeNode.setContentSize(pipeWidth, pipeHeight);
        pipeNode.setAnchorPoint(0, 0);
        pipeNode.setPosition(col * CELL, row * CELL);

        // Static rigid body
        var rb = pipeNode.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        // Single collider for entire pipe
        var collider = pipeNode.addComponent(cc.PhysicsBoxCollider);
        collider.offset = cc.v2(pipeWidth / 2, pipeHeight / 2);
        collider.size = cc.size(pipeWidth, pipeHeight);
        collider.friction = 0.5;
        collider.tag = 1; // ground

        // Sprite tiles for the pipe body ---
        var topRow = heightInTiles - 1;

        for (var h = 0; h < heightInTiles; h++) {
            var isTop = (h === topRow);
            // left half
            var leftTile = new cc.Node('pl_' + h);
            var sleft = leftTile.addComponent(cc.Sprite);
            sleft.spriteFrame = this._itemsFrame(isTop ? 'items_50' : 'items_52');
            sleft.sizeMode = cc.Sprite.SizeMode.RAW;
            leftTile.setScale(SCALE);
            leftTile.setPosition(HALF, h * CELL + HALF);
            leftTile.parent = pipeNode;

            // right half
            var rightTile = new cc.Node('pr_' + h);
            var sright = rightTile.addComponent(cc.Sprite);
            sright.spriteFrame = this._itemsFrame(isTop ? 'items_51' : 'items_53');
            sright.sizeMode = cc.Sprite.SizeMode.RAW;
            rightTile.setScale(SCALE);
            rightTile.setPosition(CELL + HALF, h * CELL + HALF);
            rightTile.parent = pipeNode;
        }

        pipeNode.parent = this.gameLayer;
        return pipeNode;
    },

    // =======================================================================
    //  STAIRCASES
    // =======================================================================
    _createAllStairs: function (stairs) {
        for (var s = 0; s < stairs.length; s++) {
            var stair = stairs[s];
            this._createStaircase(stair.col, stair.row, stair.steps, stair.direction);
        }
    },

    _createStaircase: function (startCol, startRow, steps, direction) {
        // direction  1: step 1 is 1 block tall at startCol, step N is N blocks tall
        // direction -1: step 1 is N blocks tall at startCol, step N is 1 block tall
        for (var step = 0; step < steps; step++) {
            var height;
            if (direction === 1) {
                height = step + 1;
            } else {
                height = steps - step;
            }
            var col = startCol + step;
            for (var h = 0; h < height; h++) {
                this.createGround(col, startRow + h);
            }
        }
    },

    // =======================================================================
    //  COIN (floating collectible)
    // =======================================================================
    createCoin: function (col, row) {
        var node = new cc.Node('Coin_' + col + '_' + row);
        var sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = this._itemsFrame('items_6');
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);
        node.setPosition(this._gridPos(col, row));

        // Physics — sensor so it doesn't physically block
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.allowSleep = true;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(10, 14);
        collider.sensor = true;
        collider.tag = 5; // sensor

        // Simple shimmer animation (frames 6, 7, 8)
        var coinFrames = [];
        var frameNames = ['items_6', 'items_7', 'items_8'];
        for (var i = 0; i < frameNames.length; i++) {
            var f = this._itemsFrame(frameNames[i]);
            if (f) coinFrames.push(f);
        }
        if (coinFrames.length > 0) {
            var idx = 0;
            var spr = sp;
            var frames = coinFrames;
            this.schedule(function () {
                if (!cc.isValid(node)) return;
                idx = (idx + 1) % frames.length;
                spr.spriteFrame = frames[idx];
            }.bind(this), 0.15);
        }

        // Logic component
        var coinComp = node.addComponent('Coin');
        if (coinComp) {
            coinComp.coinClip = this.coinClip;
        }

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  GOOMBA
    // =======================================================================
    createGoomba: function (col, row) {
        var node = new cc.Node('Goomba_' + col + '_' + row);
        node.setPosition(this._gridPos(col, row));

        // Sprite
        var sp = node.addComponent(cc.Sprite);
        if (this.goombaAtlas) {
            var gFrame = this.goombaAtlas.getSpriteFrame('Goomba_0.png') ||
                         this.goombaAtlas.getSpriteFrame('Goomba_0');
            sp.spriteFrame = gFrame;
        }
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);

        // Physics — dynamic body
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.linearDamping = 0;
        rb.gravityScale = 1;
        rb.allowSleep = false;

        // Collider
        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(18, 18);  // slightly smaller than visual for fairness
        collider.offset = cc.v2(0, -2);
        collider.density = 1;
        collider.friction = 0.3;
        collider.restitution = 0;
        collider.tag = 3; // enemy

        // Logic script
        var goomba = node.addComponent('Goomba');
        if (goomba) {
            goomba.atlas = this.goombaAtlas;
            goomba.stompClip = this.stompClip;
        }

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  KOOPA TROOPA
    // =======================================================================
    createKoopa: function (col, row) {
        var node = new cc.Node('Koopa_' + col + '_' + row);
        // Koopa sprite is 16×27 — a bit taller than a tile
        var pos = this._gridPos(col, row);
        pos.y += 5 * SCALE;  // nudge up since sprite is taller
        node.setPosition(pos);

        // Sprite
        var sp = node.addComponent(cc.Sprite);
        if (this.turtleAtlas) {
            var tFrame = this.turtleAtlas.getSpriteFrame('turtle_0.png') ||
                         this.turtleAtlas.getSpriteFrame('turtle_0');
            sp.spriteFrame = tFrame;
        }
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.linearDamping = 0;
        rb.gravityScale = 1;
        rb.allowSleep = false;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(14, 24);
        collider.offset = cc.v2(0, -1);
        collider.density = 1;
        collider.friction = 0.3;
        collider.restitution = 0;
        collider.tag = 3; // enemy

        // Logic script
        var koopa = node.addComponent('KoopaTroopa');
        if (koopa) {
            koopa.atlas = this.turtleAtlas;
            koopa.stompClip = this.stompClip;
        }

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  FLOWER (inside pipe — not placed in level data yet, but ready)
    // =======================================================================
    createFlower: function (col, row) {
        var node = new cc.Node('Flower_' + col + '_' + row);
        node.setPosition(this._gridPos(col, row));

        var sp = node.addComponent(cc.Sprite);
        if (this.flowerAtlas) {
            var fFrame = this.flowerAtlas.getSpriteFrame('flower_0.png') ||
                         this.flowerAtlas.getSpriteFrame('flower_0');
            sp.spriteFrame = fFrame;
        }
        sp.sizeMode = cc.Sprite.SizeMode.RAW;
        node.setScale(SCALE);

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Kinematic;
        rb.fixedRotation = true;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(16, 24);
        collider.sensor = true;
        collider.tag = 3; // enemy

        // Logic script
        var flower = node.addComponent('PiranhaFlower');
        if (flower) {
            flower.atlas = this.flowerAtlas;
        }

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  PLAYER
    // =======================================================================
    createPlayer: function (col, row) {
        var node = new cc.Node('Player');
        node.setPosition(this._gridPos(col, row));
        node.setScale(SCALE);

        // Sprite — small Mario idle frame
        var sp = node.addComponent(cc.Sprite);
        if (this.playerSmallAtlas) {
            var pFrame = this.playerSmallAtlas.getSpriteFrame('mario_small_0.png') ||
                         this.playerSmallAtlas.getSpriteFrame('mario_small_0');
            sp.spriteFrame = pFrame;
        }
        sp.sizeMode = cc.Sprite.SizeMode.RAW;

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.linearDamping = 0;
        rb.gravityScale = 1;
        rb.allowSleep = false;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        // mario_small sprites are ~16×16
        collider.size = cc.size(12, 15);
        collider.offset = cc.v2(0, 0);
        collider.density = 1;
        collider.friction = 0.3;
        collider.restitution = 0;
        collider.tag = 2; // player

        // Foot sensor — thin box at feet to detect ground contact
        var footSensor = node.addComponent(cc.PhysicsBoxCollider);
        footSensor.size = cc.size(10, 4);
        footSensor.offset = cc.v2(0, -8);
        footSensor.sensor = true;
        footSensor.tag = 2; // player foot

        // Controller script
        var ctrl = node.addComponent('PlayerController');
        if (ctrl) {
            ctrl.smallAtlas = this.playerSmallAtlas;
            ctrl.bigAtlas   = this.playerBigAtlas;
            ctrl.jumpClip   = this.jumpClip;
            ctrl.coinClip   = this.coinClip;
            ctrl.powerUpClip = this.powerUpClip;
            ctrl.levelClearClip = this.levelClearClip;
        }

        // Animator script
        var anim = node.addComponent('PlayerAnimator');
        if (anim) {
            anim.smallAtlas = this.playerSmallAtlas;
            anim.bigAtlas   = this.playerBigAtlas;
        }

        // Store globally for easy access
        window.PlayerNode = node;

        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  FLAGPOLE
    // =======================================================================
    createFlagPole: function (col, row) {
        // The pole is a tall thin node spanning rows [row .. row + 10]
        var poleHeight = 10;  // tiles

        // --- Pole (the vertical bar) ---
        var pole = new cc.Node('FlagPole');
        pole.setContentSize(CELL * 0.2, poleHeight * CELL);
        pole.setAnchorPoint(0.5, 0);
        pole.setPosition(col * CELL + HALF, row * CELL);
        pole.setScale(1);  // no extra scale

        // Draw pole as a colored rectangle
        var poleGfx = pole.addComponent(cc.Graphics);
        poleGfx.lineWidth = 0;
        poleGfx.fillColor = new cc.Color(0, 100, 0);
        var pw = CELL * 0.15;
        poleGfx.rect(-pw / 2, 0, pw, poleHeight * CELL);
        poleGfx.fill();

        // Ball on top
        poleGfx.fillColor = new cc.Color(0, 128, 0);
        poleGfx.circle(0, poleHeight * CELL, pw);
        poleGfx.fill();

        // Physics sensor — entire pole height
        var rb = pole.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;

        var collider = pole.addComponent(cc.PhysicsBoxCollider);
        collider.offset = cc.v2(0, poleHeight * CELL / 2);
        collider.size = cc.size(CELL * 0.6, poleHeight * CELL);
        collider.sensor = true;
        collider.tag = 5; // sensor (flagpole)

        pole.parent = this.gameLayer;

        // --- Flag (triangular, using colored node) ---
        var flag = new cc.Node('Flag');
        flag.setPosition(col * CELL + HALF - CELL * 0.5, (row + poleHeight - 1) * CELL);
        flag.setScale(1);

        var flagGfx = flag.addComponent(cc.Graphics);
        flagGfx.lineWidth = 0;
        flagGfx.fillColor = new cc.Color(0, 180, 0);
        flagGfx.moveTo(0, 0);
        flagGfx.lineTo(-CELL * 0.8, HALF * 0.5);
        flagGfx.lineTo(0, CELL * 0.6);
        flagGfx.close();
        flagGfx.fill();

        flag.parent = this.gameLayer;

        // --- Flag base block ---
        this.createGround(col, row);

        return pole;
    },

    // =======================================================================
    //  DEATH ZONE — invisible trigger below the visible level
    // =======================================================================
    createDeathZone: function () {
        var node = new cc.Node('DeathZone');
        node.setPosition(this._levelWidth / 2, -CELL * 2);
        node.setContentSize(this._levelWidth + 400, CELL);
        node.setAnchorPoint(0.5, 0.5);

        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(this._levelWidth + 400, CELL);
        collider.sensor = true;
        collider.tag = 5; // sensor (death)

        // Simple script-less death detection using the collider tag
        // PlayerController will check for tag 5 collider named "DeathZone"
        node.parent = this.gameLayer;
        return node;
    },

    // =======================================================================
    //  HUD — score, coins, world, time
    // =======================================================================
    createHUD: function () {
        // HUD is a child of the camera node (or Canvas), NOT gameLayer,
        // so it stays fixed on screen.
        var canvas = cc.find('Canvas');
        if (!canvas) {
            cc.warn('LevelBuilder: cannot find Canvas for HUD');
            return;
        }

        var hud = new cc.Node('HUD');
        hud.setContentSize(960, 640);
        hud.setAnchorPoint(0.5, 0.5);
        hud.setPosition(0, 0);
        hud.zIndex = 1000;

        // Widget to fill screen
        var widget = hud.addComponent(cc.Widget);
        widget.isAlignTop = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.isAlignBottom = true;
        widget.top = 0;
        widget.left = 0;
        widget.right = 0;
        widget.bottom = 0;
        widget.alignMode = cc.Widget.AlignMode.ON_WINDOW_RESIZE;

        // --- Helper to create a label node ---
        var self = this;
        function makeLabel (name, text, fontSize, x, y) {
            var n = new cc.Node(name);
            var lbl = n.addComponent(cc.Label);
            lbl.string = text;
            lbl.fontSize = fontSize;
            lbl.lineHeight = fontSize + 4;
            lbl.fontFamily = 'Arial';
            lbl.enableBold = true;
            lbl.useSystemFont = true;
            n.color = cc.Color.WHITE;
            n.setAnchorPoint(0.5, 1);
            n.setPosition(x, y);
            n.parent = hud;
            return lbl;
        }

        var topY = 300;  // near top of 640-tall canvas centred at 0

        // MARIO  label
        makeLabel('MarioLabel', 'MARIO', 20, -350, topY);
        this._scoreLbl = makeLabel('ScoreValue', '000000', 20, -350, topY - 24);

        // COINS  label
        makeLabel('CoinIcon', '×', 20, -150, topY);
        this._coinLbl = makeLabel('CoinValue', '00', 20, -120, topY);

        // WORLD  label
        makeLabel('WorldLabel', 'WORLD', 20, 50, topY);
        makeLabel('WorldValue', '1-1', 20, 50, topY - 24);

        // TIME  label
        makeLabel('TimeLabel', 'TIME', 20, 280, topY);
        this._timeLbl = makeLabel('TimeValue', '400', 20, 280, topY - 24);

        hud.parent = canvas;

        // Store HUD reference globally
        window.GameHUD = {
            scoreLbl: this._scoreLbl,
            coinLbl:  this._coinLbl,
            timeLbl:  this._timeLbl
        };

        // Start timer countdown
        this._timeRemaining = 400;
        this.schedule(this._tickTimer, 0.4);  // ~1 game-second per 0.4 real seconds
    },

    _tickTimer: function () {
        if (this._timeRemaining <= 0) return;
        this._timeRemaining--;
        if (this._timeLbl && cc.isValid(this._timeLbl.node)) {
            this._timeLbl.string = '' + this._timeRemaining;
        }
        if (this._timeRemaining <= 0) {
            // Time's up — kill player
            cc.log('TIME UP!');
            this.unschedule(this._tickTimer);
        }
    },

    // =======================================================================
    //  CAMERA (smooth follow)
    // =======================================================================
    createCamera: function () {
        // We'll move the gameLayer itself to simulate a camera following
        // the player, keeping the player roughly 1/3 from the left edge.
        this._cameraFollowEnabled = true;
        this._cameraMinX = 0;
        this._cameraMaxX = this._levelWidth - 960;
    },

    update: function (dt) {
        // Camera follow
        if (this._cameraFollowEnabled && this._playerNode && cc.isValid(this._playerNode)) {
            var playerX = this._playerNode.x;

            // Target: keep player at 1/3 of screen width from left
            var targetCamX = playerX - 960 / 3;

            // Clamp to level boundaries
            if (targetCamX < this._cameraMinX) targetCamX = this._cameraMinX;
            if (targetCamX > this._cameraMaxX) targetCamX = this._cameraMaxX;

            // Smooth lerp
            var currentX = -this.gameLayer.x;
            var lerpedX = currentX + (targetCamX - currentX) * 0.1;

            // Only scroll right, never back left (classic Mario behaviour)
            if (lerpedX > currentX) {
                this.gameLayer.x = -lerpedX;
            }
        }
    },

    // =======================================================================
    //  BACKGROUND
    // =======================================================================
    createBackground: function () {
        // --- Sky ---
        var sky = new cc.Node('Sky');
        sky.setContentSize(this._levelWidth + 200, this._levelHeight + 200);
        sky.setAnchorPoint(0, 0);
        sky.setPosition(-100, -100);
        sky.zIndex = -100;

        var skyGfx = sky.addComponent(cc.Graphics);
        skyGfx.lineWidth = 0;
        skyGfx.fillColor = SKY_COLOR;
        skyGfx.rect(0, 0, this._levelWidth + 200, this._levelHeight + 200);
        skyGfx.fill();

        sky.parent = this.gameLayer;

        // --- Hills (simple decorative green mounds) ---
        this._createHill(8, 0, 6, 3);
        this._createHill(48, 0, 8, 4);
        this._createHill(80, 0, 5, 2.5);
        this._createHill(120, 0, 7, 3.5);
        this._createHill(160, 0, 6, 3);
        this._createHill(200, 0, 4, 2);

        // --- Clouds ---
        this._createCloud(10, 11, 2);
        this._createCloud(24, 12, 1);
        this._createCloud(40, 11, 3);
        this._createCloud(56, 12, 1);
        this._createCloud(72, 11, 2);
        this._createCloud(90, 12, 1);
        this._createCloud(105, 11, 3);
        this._createCloud(130, 12, 2);
        this._createCloud(150, 11, 1);
        this._createCloud(170, 12, 2);
        this._createCloud(190, 11, 3);
    },

    /**
     * Draws a simple decorative hill (filled semi-circle).
     * col/row in grid units; widthTiles and heightTiles define the ellipse radii.
     */
    _createHill: function (col, row, widthTiles, heightTiles) {
        var node = new cc.Node('Hill');
        var cx = col * CELL + HALF;
        var cy = row * CELL;
        node.setPosition(cx, cy);
        node.zIndex = -50;

        var gfx = node.addComponent(cc.Graphics);
        gfx.lineWidth = 0;
        gfx.fillColor = new cc.Color(0, 170, 0);

        var rx = widthTiles * CELL / 2;
        var ry = heightTiles * CELL;

        // Draw an elliptical arc (top half only)
        gfx.moveTo(-rx, 0);
        for (var i = 0; i <= 20; i++) {
            var angle = Math.PI * i / 20;
            gfx.lineTo(-rx * Math.cos(angle), ry * Math.sin(angle));
        }
        gfx.lineTo(rx, 0);
        gfx.close();
        gfx.fill();

        node.parent = this.gameLayer;
    },

    /**
     * Draws simple cloud ovals.
     * widthUnits determines how many puff circles to use.
     */
    _createCloud: function (col, row, widthUnits) {
        var node = new cc.Node('Cloud');
        node.setPosition(this._gridPos(col, row));
        node.zIndex = -40;

        var gfx = node.addComponent(cc.Graphics);
        gfx.lineWidth = 0;
        gfx.fillColor = new cc.Color(255, 255, 255, 200);

        var r = CELL * 0.6;
        for (var i = 0; i < widthUnits; i++) {
            var ox = (i - (widthUnits - 1) / 2) * CELL * 0.7;
            gfx.circle(ox, 0, r);
            gfx.fill();
            // top puff
            if (i % 2 === 0) {
                gfx.circle(ox, r * 0.5, r * 0.7);
                gfx.fill();
            }
        }

        node.parent = this.gameLayer;
    },

    // =======================================================================
    //  PUBLIC API — called by other scripts at runtime
    // =======================================================================

    /**
     * Spawn a mushroom at the given grid position (called by QuestionBlock).
     */
    spawnMushroom: function (col, row) {
        var node = new cc.Node('Mushroom');
        var pos = this._gridPos(col, row);
        pos.y += CELL;  // appear above the block
        node.setPosition(pos);
        node.setScale(SCALE);

        var sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = this._itemsFrame('items_0');
        sp.sizeMode = cc.Sprite.SizeMode.RAW;

        // Physics
        var rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.gravityScale = 1;
        rb.allowSleep = false;

        var collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(14, 14);
        collider.density = 0.5;
        collider.friction = 0.3;
        collider.restitution = 0;
        collider.tag = 4; // item

        // Logic
        var mush = node.addComponent('Mushroom');
        if (mush) {
            mush.powerUpClip = this.powerUpClip;
        }

        // Launch with slight upward tween then start moving
        node.parent = this.gameLayer;

        // Give it a small initial rightward velocity after a brief pause
        this.scheduleOnce(function () {
            if (cc.isValid(node)) {
                var body = node.getComponent(cc.RigidBody);
                if (body) {
                    body.linearVelocity = cc.v2(80, 0);
                }
            }
        }, 0.3);

        // Play powerup appear sound
        if (this.powerUpClip) {
            cc.audioEngine.playEffect(this.powerUpClip);
        }

        return node;
    },

    /**
     * Spawn a bouncing coin above a block (called by QuestionBlock on coin content).
     */
    spawnCoinEffect: function (col, row) {
        var node = new cc.Node('CoinFX');
        var pos = this._gridPos(col, row);
        pos.y += HALF;
        node.setPosition(pos);
        node.setScale(SCALE);

        var sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = this._itemsFrame('items_6');
        sp.sizeMode = cc.Sprite.SizeMode.RAW;

        node.parent = this.gameLayer;

        // Quick bounce-up animation then destroy
        cc.tween(node)
            .by(0.15, { position: cc.v3(0, CELL * 2, 0) }, { easing: 'quadOut' })
            .by(0.2, { position: cc.v3(0, -CELL * 1.5, 0) }, { easing: 'quadIn' })
            .call(function () { node.destroy(); })
            .start();

        // Play coin sound
        if (this.coinClip) {
            cc.audioEngine.playEffect(this.coinClip);
        }
    },

    /**
     * Returns the level width in pixels (for camera bounds, etc.).
     */
    getLevelWidth: function () {
        return this._levelWidth;
    },

    /**
     * Returns the player node reference.
     */
    getPlayerNode: function () {
        return this._playerNode;
    },

    onDestroy: function () {
        cc.audioEngine.stopMusic();
        this.unscheduleAllCallbacks();
        window.LevelBuilder = null;
        window.PlayerNode = null;
        window.GameHUD = null;
    }
});
