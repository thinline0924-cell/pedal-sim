/* ===== STARTUP ===== */
(function start() {
  const saved = load();
  S.cmp = [0, 1, 2]; S.diffOnly = true;
  S.sheet = {layout: 'each', power: true, graph: true, date: today(), venue: '', staff: ''};
  if (saved) {
    S.patches = saved.patches; S.cur = Math.min(saved.cur || 0, saved.patches.length - 1);
    if (Array.isArray(saved.cmp)) S.cmp = saved.cmp;
    Object.assign(S.sheet, saved.sheet || {});
    applyPatch(S.patches[S.cur]);
  } else {
    S.patches = examplePatches(); S.cur = 0;
  }
  buildStrip();
  renderPatchBar();
  let lastW = 0;   // redraw only when the width changes (re-rendering the other views changes their height)
  new ResizeObserver(() => { if (S.an && S.view === 'edit') draw(); }).observe($('#view-edit'));
  window.addEventListener('resize', () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; if (S.view !== 'edit') renderAux(); });
  setView('edit');
})();
