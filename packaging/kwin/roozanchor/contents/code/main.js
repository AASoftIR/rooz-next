// KDE Plasma 6: pin Rooz's ONLY non-fullscreen window to the bottom-right
// of its actual work area. Does not touch any other application.
(function () {
    const MARGIN = 12;
    const attached = new Set();
    let applying = false;

    function isRooz(win) {
        if (!win) return false;
        const app = (String(win.resourceClass || '') + ' ' + String(win.resourceName || '')).toLowerCase();
        const title = String(win.caption || '');
        return app.split(/\s+/).some(x => x === 'rooz' || x === 'ir.aasoft.rooz') ||
               title === 'Rooz — Daily Companion';
    }

    function anchor(win) {
        if (applying || !isRooz(win) || win.fullScreen || win.minimized) return;
        const rect = win.frameGeometry;
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        // The KWin 6 API accepts the target window directly. It computes the
        // panel-free work area, even with multiple screens and custom panels.
        const area = workspace.clientArea(KWin.WorkArea, win);
        if (!area || area.width <= 0 || area.height <= 0) return;
        // Compact is a fixed-size mode, even immediately after leaving fullscreen.
        const w = Math.min(438, Math.max(100, area.width - 2 * MARGIN));
        const h = Math.min(704, Math.max(100, area.height - 2 * MARGIN));
        const x = Math.round(area.x + area.width - w - MARGIN);
        const y = Math.round(area.y + area.height - h - MARGIN);
        if (Math.abs(rect.x - x) <= 1 && Math.abs(rect.y - y) <= 1 &&
            Math.abs(rect.width - w) <= 1 && Math.abs(rect.height - h) <= 1) return;
        applying = true;
        try { win.frameGeometry = Qt.rect(x, y, w, h); }
        finally { applying = false; }
    }

    function attach(win) {
        if (!isRooz(win) || attached.has(win)) return;
        attached.add(win);
        // Do not anchor on every geometry change: that prevents dragging the
        // assistant/widget and fights the user's own window placement.
        if (win.fullScreenChanged) win.fullScreenChanged.connect(function () { anchor(win); });
        if (win.outputChanged) win.outputChanged.connect(function () { anchor(win); });
        if (win.windowShown) win.windowShown.connect(function () { anchor(win); });
        if (win.minimizedChanged) win.minimizedChanged.connect(function () { anchor(win); });
        anchor(win);
    }

    workspace.windowAdded.connect(attach);
    if (workspace.windowActivated) workspace.windowActivated.connect(function(win){attach(win);});
    if (workspace.activeWindowChanged) workspace.activeWindowChanged.connect(function(win){attach(win);});
    // Rooz hides instead of terminating. Re-anchor whenever it is shown again.
    if (workspace.windowShown) workspace.windowShown.connect(attach);
    // When activated during an existing session, anchor an already-open Rooz.
    for (const win of workspace.stackingOrder) attach(win);
})();
