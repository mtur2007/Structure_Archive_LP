// スクロールアニメーション
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// スムーススクロール
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// VIEW / EDIT フローブロック
const conceptFlow = document.getElementById('concept-flow');
const conceptFlowPanel = document.querySelector('.concept-flow-panel');
const modeFlow = document.getElementById('mode-flow');
const modeFlowPanel = document.querySelector('.mode-flow-panel');
const conceptHeader = document.querySelector('.concept-header');
const heroOverlay = document.querySelector('.video-overlay');
const flowViewWord = document.querySelector('.mode-scene-view .mode-title-word-en');
const modeScenes = Array.from(document.querySelectorAll('.mode-scene'));
const modeCards = Array.from(document.querySelectorAll('.mode-card'));
const modeVideoCards = Array.from(document.querySelectorAll('.mode-video-card'));
const modeVideos = Array.from(document.querySelectorAll('[data-mode-video]'));
const viewModeVideo = document.querySelector('[data-mode-video="view"]');
const editModeVideo = document.querySelector('[data-mode-video="edit"]');
// VIEW ブロックの終了位置。ここまでは VIEW 側のシーンを表示
const MODE_GAP_START = 0.48;
// EDIT ブロックの開始位置。ここ以降は EDIT 側のシーンを表示
const MODE_GAP_END = 0.52;
// VIEW → 眺める に切り替わり始める位置
const VIEW_TRANSLATE_START = 0.14;
// 「ただ見るだけではない」がフェードインし始める位置
const VIEW_INTRO_START = 0.3;
// 「地下や構造物の内部といった / 街の知られざる姿を発見する。」が表示され始める位置
const VIEW_DETAIL_START = 0.5;

// コンセプト見出しの各要素を表示し始める位置
const CONCEPT_LABEL_START = 0.1;
const CONCEPT_LINE_START = 0.15;
const CONCEPT_VIEW_START = 0.35;
const CONCEPT_AMP_START = 0.55;
const CONCEPT_EDIT_START = 0.75;

// EDIT → つくる に切り替わり始める位置
const EDIT_TRANSLATE_START = 0.14;
// 「ただつくるだけではない」がフェードインし始める位置
const EDIT_INTRO_START = 0.28;
// 「線路や構造物を組み替えて / 街の景色そのものを育てていける」が表示され始める位置
const EDIT_DETAIL_START = 0.48;
let activeFlowMode = null;
let scrollStopTimer = null;
let lastScrollY = window.scrollY;
let lastScrollAt = performance.now();

const normalizeProgress = (progress, start, end) => {
    const range = Math.max(end - start, 0.001);
    return Math.min(Math.max((progress - start) / range, 0), 1);
};

const updateModeFlowOverlap = () => {
    if (!flowViewWord || !modeFlow) {
        return;
    }
    modeFlow.style.setProperty('--mode-flow-overlap-y', '0px');
};

const updateHeroOverlay = () => {
    if (!heroOverlay || !conceptHeader) {
        return;
    }

    const viewportHeight = window.innerHeight || 1;
    const conceptTop = conceptHeader.getBoundingClientRect().top;
    const fadeStart = viewportHeight * 0.92;
    const fadeEnd = viewportHeight * 0.5;
    const progress = Math.min(Math.max((fadeStart - conceptTop) / Math.max(fadeStart - fadeEnd, 1), 0), 1);
    const overlayOpacity = progress * 0.98;
    const contentOpacity = Math.max(1 - progress * 1.08, 0);
    const conceptOpacity = progress;

    heroOverlay.style.setProperty('--hero-overlay-opacity', overlayOpacity.toFixed(3));
    document.documentElement.style.setProperty('--hero-content-opacity', contentOpacity.toFixed(3));
    document.documentElement.style.setProperty('--concept-reveal-opacity', conceptOpacity.toFixed(3));
};

const syncConceptProgress = (progress, forceVisible = false) => {
    if (!conceptHeader) {
        return;
    }

    const currentProgress = forceVisible ? 1 : progress;

    conceptHeader.classList.toggle('is-concept-label-visible', currentProgress >= CONCEPT_LABEL_START);
    conceptHeader.classList.toggle('is-concept-line-visible', currentProgress >= CONCEPT_LINE_START);
    conceptHeader.classList.toggle('is-concept-view-visible', currentProgress >= CONCEPT_VIEW_START);
    conceptHeader.classList.toggle('is-concept-amp-visible', currentProgress >= CONCEPT_AMP_START);
    conceptHeader.classList.toggle('is-concept-edit-visible', currentProgress >= CONCEPT_EDIT_START);
};

const syncConceptPinState = () => {
    if (!conceptHeader || !conceptFlow || !conceptFlowPanel) {
        return;
    }

    if (window.innerWidth <= 768) {
        conceptFlowPanel.classList.remove('is-fixed-center', 'is-after');
        conceptFlowPanel.style.removeProperty('--concept-fixed-left');
        conceptFlowPanel.style.removeProperty('--concept-fixed-width');
        syncConceptProgress(1, true);
        return;
    }

    const flowRect = conceptFlow.getBoundingClientRect();
    const stageRect = conceptFlow.querySelector('.concept-flow-stage')?.getBoundingClientRect();
    const panelHeight = conceptFlowPanel.offsetHeight;
    const viewportHeight = window.innerHeight || 1;
    const centerTop = (viewportHeight - panelHeight) / 2;
    const fixedBottom = centerTop + panelHeight;
    const startFixed = stageRect ? stageRect.top <= centerTop : false;
    const endFixed = stageRect ? stageRect.bottom <= fixedBottom : false;
    const scrollable = Math.max((stageRect?.height || conceptFlow.offsetHeight) - panelHeight, 1);
    const passed = stageRect ? Math.min(Math.max(centerTop - stageRect.top, 0), scrollable) : 0;
    const progress = Math.min(Math.max(passed / scrollable, 0), 1);
    const shouldCenterPin = startFixed && !endFixed;

    conceptFlowPanel.style.setProperty('--concept-fixed-left', `${flowRect.left}px`);
    conceptFlowPanel.style.setProperty('--concept-fixed-width', `${flowRect.width}px`);

    conceptFlowPanel.classList.toggle('is-fixed-center', shouldCenterPin);
    conceptFlowPanel.classList.toggle('is-after', endFixed);

    if (!startFixed) {
        conceptFlowPanel.classList.remove('is-fixed-center', 'is-after');
    }

    syncConceptProgress(progress, endFixed);
};

const setActiveFlowMode = (mode) => {
    activeFlowMode = mode;

    modeScenes.forEach((scene) => {
        scene.classList.toggle('is-active', scene.dataset.modeScene === mode);
    });

    modeCards.forEach((card) => {
        card.classList.toggle('is-active', card.dataset.modeCard === mode);
    });

    modeVideoCards.forEach((card) => {
        card.classList.toggle('is-active', card.dataset.modeVideoCard === mode);
    });
};

const pauseFlowVideos = () => {
    modeVideos.forEach((video) => {
        video.pause();
    });
};

const playActiveFlowVideo = (playbackRate = 1) => {
    const targetVideo = activeFlowMode === 'edit' ? editModeVideo : activeFlowMode === 'view' ? viewModeVideo : null;

    modeVideos.forEach((video) => {
        if (video !== targetVideo) {
            video.pause();
        }
    });

    if (!targetVideo) {
        return;
    }

    targetVideo.playbackRate = playbackRate;

    const playPromise = targetVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
    }
};

if (modeFlow && modeFlowPanel && modeVideos.length) {
    modeVideos.forEach((video) => {
        video.muted = true;
        video.playsInline = true;
        video.loop = false;
        video.pause();
    });

    const syncModeFlow = () => {
        if (conceptHeader) {
            conceptHeader.style.setProperty('--concept-view-progress', '0');
            conceptHeader.style.setProperty('--concept-view-shift-x', '0px');
            conceptHeader.style.setProperty('--concept-view-scale-target', '1');
        }

        if (window.innerWidth <= 768) {
            modeFlowPanel.classList.remove('is-fixed', 'is-after');
            modeFlowPanel.style.removeProperty('--mode-fixed-left');
            modeFlowPanel.style.removeProperty('--mode-fixed-width');
            pauseFlowVideos();
            return;
        }

        const flowRect = modeFlow.getBoundingClientRect();
        const stageRect = modeFlow.querySelector('.mode-flow-stage')?.getBoundingClientRect();
        const panelHeight = modeFlowPanel.offsetHeight;
        const viewportHeight = window.innerHeight || 1;
        const fixedTop = (viewportHeight - panelHeight) / 2;
        const fixedBottom = fixedTop + panelHeight;
        const viewEntryRange = Math.max(viewportHeight * 0.2, 1);
        const editExitRange = Math.max(viewportHeight * 0.2, 1);
        const rawViewEntryProgress = stageRect
            ? Math.min(Math.max((fixedTop - stageRect.top) / viewEntryRange, 0), 1)
            : 1;
        const rawEditExitProgress = stageRect
            ? Math.min(Math.max((stageRect.bottom - fixedBottom) / editExitRange, 0), 1)
            : 1;
        const startFixed = stageRect ? stageRect.top <= fixedTop : false;
        const endFixed = stageRect ? stageRect.bottom <= fixedBottom : false;

        modeFlowPanel.style.setProperty('--mode-fixed-left', `${flowRect.left}px`);
        modeFlowPanel.style.setProperty('--mode-fixed-width', `${flowRect.width}px`);

        modeFlowPanel.classList.toggle('is-fixed', startFixed && !endFixed);
        modeFlowPanel.classList.toggle('is-after', endFixed);

        if (!startFixed) {
            modeFlowPanel.classList.remove('is-after');
        }

        const scrollable = Math.max((stageRect?.height || modeFlow.offsetHeight) - panelHeight, 1);
        const passed = stageRect ? Math.min(Math.max(fixedTop - stageRect.top, 0), scrollable) : 0;
        const progress = Math.min(Math.max(passed / scrollable, 0), 1);
        const isViewBlock = progress < MODE_GAP_START;
        const isEditBlock = progress > MODE_GAP_END;
        const viewProgress = isViewBlock ? Math.min(progress / MODE_GAP_START, 1) : 0;
        const editProgress = isEditBlock ? Math.min((progress - MODE_GAP_END) / (1 - MODE_GAP_END), 1) : 0;
        const viewEntryProgress = isViewBlock ? rawViewEntryProgress : 1;
        const editExitProgress = isEditBlock ? rawEditExitProgress : 1;

        modeFlowPanel.style.setProperty('--view-entry-progress', viewEntryProgress.toFixed(4));
        modeFlowPanel.style.setProperty('--edit-exit-progress', editExitProgress.toFixed(4));

        modeFlowPanel.classList.toggle('is-view-intro', isViewBlock && viewProgress >= VIEW_INTRO_START);
        modeFlowPanel.classList.toggle('is-view-translated', isViewBlock && viewProgress >= VIEW_TRANSLATE_START);
        modeFlowPanel.classList.toggle('is-view-detail', isViewBlock && viewProgress >= VIEW_DETAIL_START);
        modeFlowPanel.classList.toggle('is-edit-translated', isEditBlock && editProgress >= EDIT_TRANSLATE_START);
        modeFlowPanel.classList.toggle('is-edit-intro', isEditBlock && editProgress >= EDIT_INTRO_START);
        modeFlowPanel.classList.toggle('is-edit-detail', isEditBlock && editProgress >= EDIT_DETAIL_START);

        let activeMode = null;
        if (isViewBlock) {
            activeMode = 'view';
        } else if (isEditBlock) {
            activeMode = 'edit';
        }
        setActiveFlowMode(activeMode);
    };

    const handleFlowScrollPlayback = () => {
        const now = performance.now();
        const scrollDelta = Math.abs(window.scrollY - lastScrollY);
        const timeDelta = Math.max(now - lastScrollAt, 16);
        const pixelsPerMs = scrollDelta / timeDelta;
        const playbackRate = Math.min(Math.max(0.45 + pixelsPerMs * 0.22, 0.55), 2.2);

        playActiveFlowVideo(playbackRate);

        if (scrollStopTimer) {
            window.clearTimeout(scrollStopTimer);
        }

        scrollStopTimer = window.setTimeout(() => {
            pauseFlowVideos();
        }, 140);

        lastScrollY = window.scrollY;
        lastScrollAt = now;
    };

    syncConceptPinState();
    syncModeFlow();
    updateModeFlowOverlap();
    updateHeroOverlay();
    window.addEventListener('scroll', () => {
        syncConceptPinState();
        syncModeFlow();
        handleFlowScrollPlayback();
        updateHeroOverlay();
    }, { passive: true });
    window.addEventListener('resize', () => {
        syncConceptPinState();
        modeFlow.style.setProperty('--mode-flow-overlap-y', '0px');
        syncModeFlow();
        updateModeFlowOverlap();
        updateHeroOverlay();
        pauseFlowVideos();
    });
}

syncConceptPinState();
updateHeroOverlay();


// ヒーロー動画の順次再生
let currentVideo = 1;
const totalVideos = 9;
const heroVideo = document.getElementById('hero-video');
const videoSource = document.getElementById('video-source');

if (heroVideo && videoSource) {
    // ビデオの事前読み込みと読み込み完了検知
    heroVideo.load();
    
    heroVideo.addEventListener('canplaythrough', () => {
        console.log('Video loaded and ready to play');
    });
    
    heroVideo.addEventListener('loadstart', () => {
        console.log('Video loading started');
    });
    
    heroVideo.addEventListener('ended', () => {
        currentVideo++;
        if (currentVideo > totalVideos) {
            currentVideo = 1;
        }
        
        // スクロール位置を保存
        const scrollY = window.scrollY;
        console.log('保存されたスクロール位置:', scrollY);
        
        videoSource.src = `videos/${currentVideo}.mp4`;
        heroVideo.load();
        
        // より確実なスクロール位置復元
        const restoreScroll = () => {
            window.scrollTo(0, scrollY);
            console.log('復元後のスクロール位置:', window.scrollY);
        };
        
        // 複数のタイミングで復元を試行
        requestAnimationFrame(restoreScroll);
        setTimeout(restoreScroll, 10);
        setTimeout(restoreScroll, 50);
        
        heroVideo.play();
    });
}
