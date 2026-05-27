// SceneSetupGuide.js
// Bootstrap helper — attach this to the root Canvas node in your FIRST scene.
// It creates and initializes the singleton managers (GameManager, AudioManager)
// if they don't already exist.
//
// SCENE SETUP INSTRUCTIONS FOR COCOS CREATOR 2.4.8:
// ──────────────────────────────────────────────────
//
// 1. Open the project in Cocos Creator 2.4.8
//
// 2. CREATE 4 SCENES (File → New Scene):
//    • Menu       (assets/scenes/Menu.fire)
//    • LevelSelect (assets/scenes/LevelSelect.fire)
//    • Level_1_1   (assets/scenes/Level_1_1.fire)  — rename to "1-1" in editor
//    • GameOver   (assets/scenes/GameOver.fire)
//
// 3. FOR EACH SCENE:
//    a. Select the Canvas node in the hierarchy
//    b. Add the corresponding script component:
//       - Menu:        Add "MenuScene" component
//       - LevelSelect: Add "LevelSelectScene" component
//       - Level_1_1:   Add "GameScene" component + "LevelBuilder" component
//       - GameOver:    Add "GameOverScene" component
//
// 4. FOR Level_1_1 SCENE (most important):
//    a. Select Canvas
//    b. Add "LevelBuilder" component
//    c. In the Inspector, wire these atlas references:
//       - itemsAtlas      → items.plist (in effects_UI_tiles folder)
//       - playerSmallAtlas → mario_small.plist (in player folder)
//       - playerBigAtlas   → mario_big.plist (in player folder)
//       - goombaAtlas      → Goomba.plist (in enemies folder)
//       - turtleAtlas      → Turtle.plist (in enemies folder)
//       - flowerAtlas      → Flower.plist (in enemies folder)
//    d. Wire audio clips:
//       - bgmClip     → bgm_1.mp3
//       - coinClip    → coin.wav
//       - jumpClip    → jump.wav
//       - stompClip   → stomp.wav
//       - powerUpClip → PowerUp.mp3
//       - levelClearClip → levelClear.mp3
//
// 5. CONFIGURE BUILD SETTINGS:
//    - Project → Project Settings → Module Config → Enable "Physics"
//    - In Project Settings → Group Manager, add groups:
//      default(0), player(1), ground(2), enemy(3), item(4), sensor(5)
//    - Set up collision matrix so all groups collide with each other
//
// 6. SET START SCENE:
//    - Project → Project Settings → General → Start Scene → Menu
//
// 7. BUILD & PREVIEW:
//    - Click the Play button (Browser preview)
//    - Use Arrow keys + Space to play

cc.Class({
    extends: cc.Component,

    onLoad () {
        // ── Create GameManager if not present ──
        if (!window.GameManager) {
            var gmNode = new cc.Node('GameManager');
            gmNode.addComponent('GameManager');
            // GameManager's onLoad will call cc.game.addPersistRootNode
        }

        // ── Create AudioManager if not present ──
        if (!window.AudioManager) {
            var amNode = new cc.Node('AudioManager');
            amNode.addComponent('AudioManager');
            // AudioManager's onLoad will call cc.game.addPersistRootNode
        }

        cc.log('[SceneSetup] Bootstrap complete');
    },
});
