// AudioManager.js
// Singleton audio controller — persists across scenes via cc.game.addPersistRootNode.
// Access from anywhere: window.AudioManager

cc.Class({
    extends: cc.Component,

    properties: {
        // ────────────────── Background Music Clips ──────────────────
        bgm1: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Main overworld BGM',
        },
        bgm2: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Underground / alternate BGM',
        },
        bgm3: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'Castle / boss BGM',
        },

        // ────────────────── Sound Effect Clips ──────────────────────
        sfxJump: {
            default: null,
            type: cc.AudioClip,
        },
        sfxCoin: {
            default: null,
            type: cc.AudioClip,
        },
        sfxStomp: {
            default: null,
            type: cc.AudioClip,
        },
        sfxKick: {
            default: null,
            type: cc.AudioClip,
        },
        sfxPowerUp: {
            default: null,
            type: cc.AudioClip,
        },
        sfxPowerDown: {
            default: null,
            type: cc.AudioClip,
        },
        sfxPowerUpAppear: {
            default: null,
            type: cc.AudioClip,
        },
        sfxLoseLife: {
            default: null,
            type: cc.AudioClip,
        },
        sfxGameOver: {
            default: null,
            type: cc.AudioClip,
        },
        sfxGameOver2: {
            default: null,
            type: cc.AudioClip,
        },
        sfxLevelClear: {
            default: null,
            type: cc.AudioClip,
        },
        sfxReserve: {
            default: null,
            type: cc.AudioClip,
        },

        // ────────────────── Volume Settings ─────────────────────────
        bgmVolume: {
            default: 0.5,
            type: cc.Float,
            range: [0, 1],
            slide: true,
            tooltip: 'Background music volume (0–1)',
        },
        sfxVolume: {
            default: 0.8,
            type: cc.Float,
            range: [0, 1],
            slide: true,
            tooltip: 'Sound effects volume (0–1)',
        },
    },

    // ───────────────────────────── Lifecycle ─────────────────────────────

    onLoad () {
        // ---------- Singleton guard ----------
        if (window.AudioManager && window.AudioManager !== this) {
            this.node.destroy();
            return;
        }

        window.AudioManager = this;
        cc.game.addPersistRootNode(this.node);

        // Current BGM audio ID (returned by cc.audioEngine), -1 means nothing playing
        this._currentBgmId = -1;
        // Name of the clip currently playing as BGM, for quick checks
        this._currentBgmName = '';

        cc.log('[AudioManager] Initialised');
    },

    // ───────────────────────── BGM Playback ─────────────────────────────

    /**
     * Play a background music clip by property name.
     * If the same clip is already playing it is NOT restarted.
     * @param {string} clipName — one of 'bgm1', 'bgm2', 'bgm3'
     */
    playBGM (clipName) {
        // Avoid restarting the same track
        if (this._currentBgmName === clipName && this._currentBgmId !== -1) {
            return;
        }

        var clip = this[clipName];
        if (!clip) {
            cc.warn('[AudioManager] BGM clip not assigned: ' + clipName);
            return;
        }

        // Stop whatever is currently playing
        this.stopBGM();

        this._currentBgmId = cc.audioEngine.playMusic(clip, true);
        cc.audioEngine.setMusicVolume(this.bgmVolume);
        this._currentBgmName = clipName;

        cc.log('[AudioManager] Playing BGM: ' + clipName);
    },

    /**
     * Stop the current background music.
     */
    stopBGM () {
        if (this._currentBgmId !== -1) {
            cc.audioEngine.stopMusic();
            this._currentBgmId   = -1;
            this._currentBgmName = '';
            cc.log('[AudioManager] BGM stopped');
        }
    },

    // ───────────────────────── SFX Playback ─────────────────────────────

    /**
     * Play a one-shot sound effect.  Does NOT interrupt BGM.
     * @param {string} clipName — property name, e.g. 'sfxJump', 'sfxCoin'
     */
    playSFX (clipName) {
        var clip = this[clipName];
        if (!clip) {
            cc.warn('[AudioManager] SFX clip not assigned: ' + clipName);
            return;
        }

        var effectId = cc.audioEngine.playEffect(clip, false);
        cc.audioEngine.setEffectsVolume(this.sfxVolume);

        return effectId;
    },

    // ───────────────────────── Volume Control ───────────────────────────

    /**
     * Update BGM and SFX volume levels.
     * @param {number} bgm — 0–1
     * @param {number} sfx — 0–1
     */
    setVolume (bgm, sfx) {
        if (bgm !== undefined && bgm !== null) {
            this.bgmVolume = cc.misc.clampf(bgm, 0, 1);
            cc.audioEngine.setMusicVolume(this.bgmVolume);
        }
        if (sfx !== undefined && sfx !== null) {
            this.sfxVolume = cc.misc.clampf(sfx, 0, 1);
            cc.audioEngine.setEffectsVolume(this.sfxVolume);
        }

        cc.log('[AudioManager] Volume set — BGM: ' + this.bgmVolume + ', SFX: ' + this.sfxVolume);
    },
});
