/* Kiên's Journal — Màn 3 · Article
   API:
     GET  /api/posts/<slug>             → bài viết (cấu trúc như mock-posts.js)
     POST /api/posts/<slug>/reactions   { type }                 → { reactions }
     POST /api/posts/<slug>/notes       { message, name, email } → 2xx nếu thành công */
(function () {
  'use strict';

  // false = bỏ qua backend, luôn dùng dữ liệu mẫu (mock-posts.js). Đổi thành true khi đã có API.
  var USE_API = false;
  var API_BASE = '/api';
  var params = new URLSearchParams(location.search);
  var MOCK = !USE_API || location.protocol === 'file:' || params.has('mock');
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
  var WORDS_PER_MIN = 220;
  var FONT_STEPS = [15, 16, 17, 18, 20, 22, 24];
  var THEMES = { cream: 'Warm Cream', parchment: 'Parchment', charcoal: 'Charcoal' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var store = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem('kj.' + key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('kj.' + key, JSON.stringify(value)); } catch (e) { /* bỏ qua */ }
    }
  };

  var slug = params.get('slug') || (MOCK ? window.MOCK_DEFAULT_SLUG : '');
  var post = null;
  var readMinutes = 0;
  var readDone = 0;
  var readingSection = '';
  var fontSize = 18;

  /* ---------- Toast ---------- */
  function toast(message, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'toast' + (opts.kind ? ' toast--' + opts.kind : '');
    el.setAttribute('role', opts.kind === 'error' ? 'alert' : 'status');
    var text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);
    var timer;
    function close() {
      clearTimeout(timer);
      if (!el.isConnected) return;
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 200);
    }
    if (opts.action) {
      var act = document.createElement('button');
      act.type = 'button';
      act.className = 'toast__action';
      act.textContent = opts.action;
      act.addEventListener('click', function () { close(); opts.onAction(); });
      el.appendChild(act);
    }
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'toast__close';
    x.setAttribute('aria-label', 'Đóng');
    x.textContent = '×';
    x.addEventListener('click', close);
    el.appendChild(x);
    $('#toasts').appendChild(el);
    timer = setTimeout(close, opts.duration || 3500);
    el.addEventListener('mouseenter', function () { clearTimeout(timer); });
    el.addEventListener('mouseleave', function () { timer = setTimeout(close, 2000); });
    return close;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function request(method, path, body) {
    if (MOCK) return mockRequest(method, path, body);
    return fetch(API_BASE + path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      var isJson = /json/.test(res.headers.get('Content-Type') || '');
      if (!res.ok) {
        var err = new Error('HTTP ' + res.status);
        err.status = res.status;
        err.noApi = !isJson; // server tĩnh trả trang 404 HTML → chưa có API
        throw err;
      }
      if (res.status === 204) return null;
      if (!isJson) { var e2 = new Error('API không trả JSON'); e2.noApi = true; throw e2; }
      return res.json();
    }, function (netErr) {
      netErr.noApi = true;
      throw netErr;
    });
  }

  function useMock() {
    MOCK = true;
    if (!slug) slug = window.MOCK_DEFAULT_SLUG;
    console.info('[article] Chưa có API ở ' + location.origin + API_BASE + ' → dùng dữ liệu mẫu (mock-posts.js).');
  }

  function mockRequest(method, path, body) {
    return wait(250).then(function () {
      var m = path.match(/^\/posts\/([^/]+)(?:\/(reactions|notes))?$/);
      var p = m && window.MOCK_POSTS[decodeURIComponent(m[1])];
      if (!p) { var e = new Error('Not found'); e.status = 404; throw e; }
      if (!m[2]) return JSON.parse(JSON.stringify(p));
      if (m[2] === 'reactions') {
        p.reactions[body.type] = (p.reactions[body.type] || 0) + 1;
        return { reactions: p.reactions };
      }
      if (/fail/i.test(body.message)) throw new Error('Mock: gửi thất bại'); // gõ "fail" để thử lỗi
      return { ok: true };
    });
  }

  function showState(html) {
    var el = $('#state');
    el.removeAttribute('aria-busy');
    el.innerHTML = html;
    el.hidden = false;
    $('#article').hidden = true;
  }

  function load() {
    if (!slug && IS_LOCAL && !MOCK) useMock();
    if (!slug) {
      showState('Không tìm thấy bài viết: đường dẫn thiếu <code>?slug=</code>. <a href="./">Về trang chủ</a>');
      return;
    }
    request('GET', '/posts/' + encodeURIComponent(slug))
      .catch(function (err) {
        if (!MOCK && IS_LOCAL && err.noApi) {
          useMock();
          return request('GET', '/posts/' + encodeURIComponent(slug));
        }
        throw err;
      })
      .then(render)
      .catch(function (err) {
        showState(err.status === 404
          ? 'Bài viết này không còn trong lưu trữ. <a href="./">Về trang chủ</a>'
          : 'Không tải được bài viết. <a href="">Thử lại</a>');
        console.error(err);
      });
  }

  function countWords(html) {
    var text = html.replace(/<[^>]+>/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function relativeTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var days = Math.round((d - Date.now()) / 864e5);
    var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (Math.abs(days) < 1) return 'Revised today';
    if (Math.abs(days) < 30) return 'Revised ' + rtf.format(days, 'day');
    return 'Revised ' + rtf.format(Math.round(days / 30), 'month');
  }

  function render(data) {
    post = data;
    var minutes = readMinutes = data.readMinutes || Math.max(1, Math.round(countWords(data.content || '') / WORDS_PER_MIN));
    var fields = {
      title: data.title,
      excerpt: data.excerpt,
      tag: data.tag,
      side: data.side,
      essayNo: data.essayNo,
      essayLabel: data.essayNo ? 'Essay #' + String(data.essayNo).padStart(2, '0') : '',
      revision: data.revision,
      author: data.author && data.author.name,
      date: formatDate(data.publishedAt),
      readTime: minutes + ' min read',
      updatedAt: data.updatedAt,
      revised: data.updatedAt ? relativeTime(data.updatedAt) : '',
      colophon: data.colophon,
      ledger: data.ledger
    };

    document.title = data.title + ' · Kiên’s Journal';
    $$('[data-field]').forEach(function (el) {
      var key = el.getAttribute('data-field');
      if (key === 'avatar') {
        if (data.author && data.author.avatar) el.src = data.author.avatar;
        return;
      }
      el.textContent = fields[key] == null ? '' : fields[key];
    });
    $$('[data-if]').forEach(function (el) {
      el.hidden = !fields[el.getAttribute('data-if')];
    });
    var time = $('[data-field="date"]');
    if (data.publishedAt) time.setAttribute('datetime', data.publishedAt);

    var prose = $('#prose');
    prose.innerHTML = data.content || '<p>Bài viết chưa có nội dung.</p>';
    enhanceProse(prose);

    renderLeaf($('#leaf-prev'), data.prev, 'Previous Leaf');
    renderLeaf($('#leaf-next'), data.next, 'Next Leaf');
    renderReactions(data.reactions || {});

    $('#state').hidden = true;
    $('#article').hidden = false;
    $('#article').classList.add('is-entering');
    buildToc(prose);
    addHeadingLinks(prose);
    updateProgress();

    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) { target.scrollIntoView(); return; }
    }
    offerResume();
  }

  function posKey() { return 'pos.' + slug; }

  function offerResume() {
    var saved = store.get(posKey(), null);
    if (!saved || saved.done < 0.05 || saved.done > 0.95) return;
    var section = saved.section;
    toast(section ? 'Bạn đang đọc dở ở mục “' + section + '”.' : 'Bạn đã đọc được ' + Math.round(saved.done * 100) + '% bài này.', {
      action: 'Đọc tiếp',
      duration: 8000,
      onAction: function () { scrollToProgress(saved.done); }
    });
  }

  function scrollToProgress(done) {
    var r = $('.reader__main').getBoundingClientRect();
    var total = Math.max(r.height - innerHeight / 2, 1);
    window.scrollTo({ top: scrollY + r.top - innerHeight / 2 + done * total });
  }

  var saveTimer;
  function savePosition() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (readDone > 0.97) store.set(posKey(), null);
      else if (readDone > 0.02) store.set(posKey(), { done: +readDone.toFixed(4), section: readingSection, at: Date.now() });
    }, 400);
  }

  function headingText(h) { return h.firstChild ? h.firstChild.textContent.trim() : ''; }

  function addHeadingLinks(root) {
    $$('h2[id]', root).forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'heading-link';
      a.href = '#' + h.id;
      a.textContent = '#';
      a.setAttribute('aria-label', 'Sao chép liên kết tới mục này');
      a.title = 'Sao chép liên kết tới mục này';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        history.replaceState(null, '', '#' + h.id);
        copyText(location.href).then(
          function () { toast('Đã sao chép liên kết tới mục “' + headingText(h) + '”.'); },
          function () { toast('Không sao chép được — bạn có thể lấy liên kết trên thanh địa chỉ.', { kind: 'error' }); }
        );
      });
      h.appendChild(a);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* bỏ qua */ }
      ta.remove();
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function renderLeaf(el, leaf, label) {
    el.hidden = !leaf;
    if (!leaf) return;
    el.href = 'article.html?slug=' + encodeURIComponent(leaf.slug) + (USE_API && params.has('mock') ? '&mock=1' : '');
    $('[data-leaf="label"]', el).textContent = label + (leaf.essayNo ? ' · Essay #' + String(leaf.essayNo).padStart(2, '0') : '');
    $('[data-leaf="title"]', el).textContent = leaf.title;
    $('[data-leaf="meta"]', el).textContent = [leaf.side, leaf.readMinutes && leaf.readMinutes + ' min read'].filter(Boolean).join(' · ');
  }

  function enhanceProse(root) {
    $$('pre', root).forEach(function (pre) {
      var wrap = document.createElement('div');
      wrap.className = 'code-block';
      var bar = document.createElement('div');
      bar.className = 'code-block__bar';
      var left = document.createElement('span');
      left.className = 'code-block__dots';
      left.innerHTML = '<i></i><i></i><i></i>';
      if (pre.dataset.file) {
        var file = document.createElement('span');
        file.className = 'code-block__file';
        file.textContent = pre.dataset.file;
        left.appendChild(file);
      }
      var meta = document.createElement('span');
      meta.className = 'code-block__meta';
      meta.textContent = pre.dataset.meta || pre.dataset.lang || '';
      bar.append(left, meta);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.append(bar, pre);
    });

    $$('img', root).forEach(function (img) {
      var fig = img.closest('figure');
      if (fig) fig.classList.add('photo');
      var frame = document.createElement('div');
      frame.className = 'photo__frame';
      frame.setAttribute('data-alt', img.alt || 'Không tải được ảnh');
      img.parentNode.insertBefore(frame, img);
      frame.appendChild(img);
      img.loading = 'lazy';
      if (fig && fig.dataset.coords) {
        var c = document.createElement('span');
        c.className = 'photo__coords';
        c.textContent = fig.dataset.coords;
        frame.appendChild(c);
      }
      img.addEventListener('error', function () {
        frame.classList.add('is-broken');
        img.remove();
      });
    });

    $$('a[href^="http"]', root).forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
  }

  function slugify(text) {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'muc';
  }

  function readingLine() {
    return (parseFloat(getComputedStyle(document.body).getPropertyValue('--header-h')) || 0) + 40;
  }

  function buildToc(root) {
    var list = $('#toc-list');
    var headings = $$('h2', root);
    list.innerHTML = '';
    $('#toc').hidden = headings.length === 0;
    if (!headings.length) return;

    var words = 0;
    var used = {};
    var marks = new Map();
    Array.prototype.forEach.call(root.children, function (el) {
      if (el.tagName === 'H2') marks.set(el, words);
      words += countWords(el.textContent);
    });

    var links = headings.map(function (h) {
      var id = h.id || slugify(h.textContent);
      while (used[id] || (!h.id && document.getElementById(id))) id += '-2';
      used[id] = true;
      h.id = id;

      var a = document.createElement('a');
      a.className = 'toc__link';
      a.href = '#' + id;
      var text = document.createElement('span');
      text.className = 'toc__text';
      text.textContent = headingText(h);
      text.title = text.textContent;
      var time = document.createElement('span');
      time.className = 'toc__time';
      time.textContent = String(Math.max(1, Math.round(marks.get(h) / WORDS_PER_MIN) + 1)).padStart(2, '0') + 'm';
      a.append(text, time);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + id);
      });
      var li = document.createElement('li');
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });

    var current = -1;
    function syncActive() {
      var line = readingLine();
      var idx = -1;
      headings.forEach(function (h, i) { if (h.getBoundingClientRect().top <= line) idx = i; });
      if (idx === current) return;
      current = idx;
      readingSection = idx >= 0 ? headingText(headings[idx]) : '';
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === idx); });
      if (links[idx]) links[idx].scrollIntoView({ block: 'nearest' });
    }
    onScroll(syncActive);
    syncActive();
  }

  var scrollHandlers = [];
  var ticking = false;
  function onScroll(fn) { scrollHandlers.push(fn); }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      scrollHandlers.forEach(function (fn) { fn(); });
    });
  }, { passive: true });

  function updateProgress() {
    var main = $('.reader__main');
    if (!main || $('#article').hidden) return;
    var r = main.getBoundingClientRect();
    var total = r.height - innerHeight / 2;
    var done = Math.min(1, Math.max(0, (innerHeight / 2 - r.top) / Math.max(total, 1)));
    readDone = done;
    $('#progress-bar').style.height = (done * 100).toFixed(2) + '%';

    var leftText = done >= 0.98 ? 'Đã đọc xong' : 'Còn ~' + Math.max(1, Math.ceil(readMinutes * (1 - done))) + ' phút';
    $('#time-left').textContent = leftText;
    $('#to-top-label').textContent = leftText;
    $('#to-top-ring').style.strokeDashoffset = (125.66 * (1 - done)).toFixed(2);
    $('#to-top').hidden = scrollY < innerHeight * 0.8;
    savePosition();
  }
  onScroll(updateProgress);
  window.addEventListener('resize', updateProgress);

  function applyTheme(name) {
    if (!THEMES[name]) name = 'cream';
    Object.keys(THEMES).forEach(function (t) { document.body.classList.toggle('theme-' + t, t === name); });
    $$('.swatch').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.theme === name)); });
    $('#theme-label').textContent = THEMES[name];
    store.set('theme', name);
  }

  function applyFontSize(size) {
    var i = FONT_STEPS.indexOf(size);
    if (i < 0) { size = 18; i = FONT_STEPS.indexOf(18); }
    fontSize = size;
    document.body.style.setProperty('--prose-size', size + 'px');
    $('#font-down').disabled = i === 0;
    $('#font-up').disabled = i === FONT_STEPS.length - 1;
    store.set('fontSize', size);
  }

  function applyFontFamily(kind) {
    if (kind !== 'serif') kind = 'sans';
    document.body.classList.toggle('font-serif', kind === 'serif');
    document.body.classList.toggle('font-sans', kind === 'sans');
    $$('.segmented__btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.font === kind)); });
    store.set('fontFamily', kind);
  }

  function stepFont(dir) {
    var i = FONT_STEPS.indexOf(fontSize) + dir;
    if (i >= 0 && i < FONT_STEPS.length) applyFontSize(FONT_STEPS[i]);
  }

  function initDesk() {
    applyTheme(store.get('theme', 'cream'));
    applyFontSize(store.get('fontSize', 18));
    applyFontFamily(store.get('fontFamily', 'sans'));
    $$('.swatch').forEach(function (b) { b.addEventListener('click', function () { applyTheme(b.dataset.theme); }); });
    $$('.segmented__btn').forEach(function (b) { b.addEventListener('click', function () { applyFontFamily(b.dataset.font); }); });
    $('#font-down').addEventListener('click', function () { stepFont(-1); });
    $('#font-up').addEventListener('click', function () { stepFont(1); });
    $('#quick-theme').addEventListener('click', function () {
      applyTheme(document.body.classList.contains('theme-charcoal') ? 'cream' : 'charcoal');
    });
    $('#focus-toggle').addEventListener('click', function () { setFocus(true); });
    $('#focus-exit').addEventListener('click', function () { setFocus(false); });
    $('#to-top').addEventListener('click', function () { window.scrollTo({ top: 0 }); });
    document.addEventListener('keydown', onShortcut);
  }

  function setFocus(on) {
    if (on === document.body.classList.contains('is-focus')) return;
    var keep = readDone; // giữ chỗ đang đọc khi layout đổi
    document.body.classList.toggle('is-focus', on);
    $('#focus-toggle').setAttribute('aria-pressed', String(on));
    if (!$('#article').hidden) scrollToProgress(keep);
    if (on) toast('Chế độ tập trung — nhấn Esc để thoát.', { duration: 2500 });
  }

  function onShortcut(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    switch (e.key) {
      case 'f': case 'F': setFocus(!document.body.classList.contains('is-focus')); break;
      case 'Escape':
        if (!document.body.classList.contains('is-focus')) return;
        setFocus(false);
        break;
      case '+': case '=': stepFont(1); break;
      case '-': case '_': stepFont(-1); break;
      case 't': case 'T': cycleTheme(); break;
      case 'm': case 'M': $('#audio-btn').click(); break;
      default: return;
    }
    e.preventDefault();
  }

  function cycleTheme() {
    var names = Object.keys(THEMES);
    var cur = names.filter(function (n) { return document.body.classList.contains('theme-' + n); })[0];
    var next = names[(names.indexOf(cur) + 1) % names.length];
    applyTheme(next);
    toast('Nền: ' + THEMES[next], { duration: 1500 });
  }

  function reactedKey() { return 'reacted.' + slug; }

  function renderReactions(counts) {
    var reacted = store.get(reactedKey(), {});
    $$('.reaction').forEach(function (btn) {
      var type = btn.dataset.reaction;
      $('.reaction__count', btn).textContent = counts[type] || 0;
      var done = !!reacted[type];
      btn.setAttribute('aria-pressed', String(done));
      btn.disabled = done;
    });
  }

  function initReactions() {
    $('#reactions').addEventListener('click', function (e) {
      var btn = e.target.closest('.reaction');
      if (!btn || btn.disabled || !post) return;
      var type = btn.dataset.reaction;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      request('POST', '/posts/' + encodeURIComponent(slug) + '/reactions', { type: type })
        .then(function (res) {
          var reacted = store.get(reactedKey(), {});
          reacted[type] = true;
          store.set(reactedKey(), reacted);
          if (res && res.reactions) post.reactions = res.reactions;
          else post.reactions[type] = (post.reactions[type] || 0) + 1;
          renderReactions(post.reactions);
          btn.classList.remove('is-bump');
          void btn.offsetWidth;
          btn.classList.add('is-bump');
          toast('Cảm ơn bạn đã để lại ' + $('.reaction__emoji', btn).textContent + '.', { duration: 2500 });
        })
        .catch(function (err) {
          console.error(err);
          btn.disabled = false;
          toast('Chưa ghi nhận được, bạn thử lại nhé.', { kind: 'error' });
        })
        .then(function () { btn.removeAttribute('aria-busy'); });
    });
  }

  function initNoteForm() {
    var form = $('#note-form');
    var status = $('#note-status');
    var submit = $('button[type="submit"]', form);

    function setStatus(text, kind) {
      status.textContent = text;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    var counter = $('#char-count');
    var draftHint = $('#draft-hint');
    var max = form.message.maxLength;
    var draftKey = 'draft.' + slug;
    var draftTimer;

    function updateCount() {
      var n = form.message.value.length;
      counter.textContent = n + ' / ' + max;
      counter.classList.toggle('is-near', n > max * 0.9);
    }

    var draft = store.get(draftKey, null);
    if (draft) {
      form.message.value = draft.message || '';
      form.elements.name.value = draft.name || '';
      form.email.value = draft.email || '';
      draftHint.textContent = 'Đã khôi phục bản nháp chưa gửi';
    }
    updateCount();

    form.addEventListener('input', function (e) {
      e.target.removeAttribute('aria-invalid');
      if (status.classList.contains('is-error')) setStatus('');
      updateCount();
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        var d = { message: form.message.value, name: form.elements.name.value, email: form.email.value };
        var has = d.message || d.name || d.email;
        store.set(draftKey, has ? d : null);
        draftHint.textContent = has ? 'Đã lưu nháp' : '';
      }, 500);
    });

    form.message.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var message = form.message.value.trim();
      var name = form.elements.name.value.trim();
      var email = form.email.value.trim();

      if (!message) {
        form.message.setAttribute('aria-invalid', 'true');
        form.message.focus();
        return setStatus('Bạn chưa viết gì trong lá thư.', 'error');
      }
      if (email && !form.email.checkValidity()) {
        form.email.setAttribute('aria-invalid', 'true');
        form.email.focus();
        return setStatus('Email chưa đúng định dạng.', 'error');
      }

      submit.disabled = true;
      setStatus('Đang gửi…');
      request('POST', '/posts/' + encodeURIComponent(slug) + '/notes', { message: message, name: name, email: email })
        .then(function () {
          form.reset();
          clearTimeout(draftTimer);
          store.set(draftKey, null);
          draftHint.textContent = '';
          updateCount();
          $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
          setStatus('Đã gửi! Kiên sẽ đọc lá thư của bạn vào một buổi sáng sớm.', 'ok');
        })
        .catch(function (err) {
          console.error(err);
          setStatus('Gửi chưa được, vui lòng thử lại sau.', 'error');
        })
        .then(function () { submit.disabled = false; });
    });
  }

  function initAudio() {
    var audio = $('#ambience');
    var player = $('.player');
    var status = $('#audio-status');
    var btn = $('#audio-btn');
    var pills = $$('.pill-btn[data-audio-toggle]');

    function sync(state) {
      var playing = state === 'playing';
      player.classList.toggle('is-playing', playing);
      player.classList.toggle('is-error', state === 'error');
      pills.forEach(function (p) { p.classList.toggle('is-playing', playing); });
      btn.setAttribute('aria-label', playing ? 'Tạm dừng nhạc nền' : 'Phát nhạc nền');
      status.textContent = 'Hanoi Soundscape · ' + (
        state === 'playing' ? 'Đang phát' :
        state === 'loading' ? 'Đang tải…' :
        state === 'error' ? 'Không tải được âm thanh' : 'Tạm dừng');
    }

    function toggle() {
      if (audio.paused) {
        sync('loading');
        var p = audio.play();
        if (p) p.catch(function (err) { if (err.name !== 'AbortError') sync('error'); });
      } else {
        audio.pause();
      }
    }

    audio.volume = 0.6;
    audio.addEventListener('playing', function () { sync('playing'); });
    audio.addEventListener('pause', function () { if (!audio.error) sync('paused'); });
    audio.addEventListener('error', function () { sync('error'); });
    $$('[data-audio-toggle]').forEach(function (el) { el.addEventListener('click', toggle); });
  }

  initDesk();
  initReactions();
  initNoteForm();
  initAudio();
  load();
})();
