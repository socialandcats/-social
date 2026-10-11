/* Движок тестов «Обществознание и котики» (v2).
   Данные теста лежат в window.TEST (см. test-*.html).
   Типы заданий: sud (верные суждения), extra (лишние), pick (выбор из списка), match (соответствие). */
(function () {
  var T = window.TEST;
  var list = document.getElementById('q-list');
  var KEY = 'oik-test-' + T.id;
  var state = load() || {};
  var LET = 'АБВГДЕЖЗ';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function sameSet(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) < 0) return false; return true; }
  function fmt(arr) { return arr.slice().sort(function (x, y) { return x - y; }).join(''); }

  var LABELS = {
    sud:   { type: 'Верные суждения', hint: 'Отметьте все верные суждения — их может быть несколько.', yes: 'Верно', no: 'Неверно', limit: 0 },
    extra: { type: 'Лишние характеристики', hint: 'Отметьте два термина, которые «выпадают» из общего ряда.', yes: 'Лишнее', no: 'Относится', limit: 2 },
    pick:  { type: 'Выбор из списка', hint: 'Отметьте все подходящие варианты.', yes: 'Подходит', no: 'Не подходит', limit: 0 },
    match: { type: 'Соответствие', hint: 'Для каждой позиции слева выберите номер из правого столбца.' }
  };

  function head(card, q, qi) {
    var L = LABELS[q.type];
    var h = el('div', 'q-head');
    h.appendChild(el('span', 'q-num', String(qi + 1)));
    h.appendChild(el('span', 'q-type', L.type));
    card.appendChild(h);
    card.appendChild(el('p', 'q-text', q.text));
    if (q.img) { var im = el('img', 'q-img'); im.src = q.img; im.alt = 'Диаграмма к заданию'; im.loading = 'lazy'; card.appendChild(im); }
    card.appendChild(el('p', 'q-hint', q.hint || L.hint));
  }

  function verdictHTML(q, st, right, mine) {
    return '<strong>' + (st.ok ? 'Верно! 🐾' : 'Неверно') + '</strong>' +
      'Правильный ответ: <b>' + right + '</b>' + (st.ok ? '' : ' · ваш ответ: ' + mine) +
      (q.explain ? '<p>' + q.explain + '</p>' : '') +
      (q.notes && Object.keys(q.notes).length ? '<p style="color:var(--muted);font-size:14px">Пояснения — под каждым вариантом.</p>' : '');
  }

  function actions(card) {
    var a = el('div', 'q-actions');
    var btn = el('button', 'btn', 'Проверить'); btn.type = 'button';
    var picked = el('span', 'picked', '');
    a.appendChild(btn); a.appendChild(picked); card.appendChild(a);
    var verdict = el('div', 'verdict'); card.appendChild(verdict);
    return { btn: btn, picked: picked, verdict: verdict };
  }

  /* ---------- выбор вариантов (sud / extra / pick) ---------- */
  function renderChoice(q, qi, card, st) {
    var L = LABELS[q.type];
    var ul = el('ul', 'opts'), items = [];
    q.opts.forEach(function (o, oi) {
      var n = oi + 1;
      var li = el('li', 'opt');
      li.setAttribute('role', 'checkbox'); li.setAttribute('tabindex', '0');
      li.appendChild(el('span', 'box', String(n)));
      var t = el('div', 'txt');
      t.appendChild(el('span', '', o));
      t.appendChild(el('span', 'flag', ''));
      var note = q.notes && q.notes[n];
      if (note) t.appendChild(el('div', 'note', '<b>' + (q.ans.indexOf(n) >= 0 ? L.yes : L.no) + ':</b> ' + note));
      li.appendChild(t);
      li.addEventListener('click', function () { toggle(n); });
      li.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(n); } });
      ul.appendChild(li); items.push(li);
    });
    card.appendChild(ul);
    var A = actions(card);
    st.sel = st.sel || [];

    function toggle(n) {
      if (st.done) return;
      var i = st.sel.indexOf(n);
      if (i >= 0) st.sel.splice(i, 1);
      else { if (L.limit && st.sel.length >= L.limit) st.sel.shift(); st.sel.push(n); }
      save(); paint();
    }
    A.btn.addEventListener('click', function () {
      if (!st.sel.length || st.done) return;
      st.done = true; st.ok = sameSet(st.sel, q.ans); save(); paint(); update();
    });
    function paint() {
      items.forEach(function (li, oi) {
        var n = oi + 1, s = st.sel.indexOf(n) >= 0, a = q.ans.indexOf(n) >= 0, flag = li.querySelector('.flag');
        li.className = 'opt'; li.setAttribute('aria-checked', s ? 'true' : 'false'); flag.textContent = '';
        if (!st.done) { if (s) li.classList.add('sel'); return; }
        if (s && a) { li.classList.add('right'); flag.textContent = '✓'; }
        else if (s && !a) { li.classList.add('wrong'); flag.textContent = '✗ ошибка'; }
        else if (!s && a) { li.classList.add('missed'); flag.textContent = '← надо было выбрать'; }
      });
      A.picked.textContent = st.done ? '' : (st.sel.length ? 'Выбрано: ' + fmt(st.sel) : 'Ничего не выбрано');
      A.btn.disabled = st.done || !st.sel.length; A.btn.style.display = st.done ? 'none' : '';
      card.classList.toggle('done', !!st.done);
      if (st.done) { A.verdict.className = 'verdict ' + (st.ok ? 'good' : 'bad'); A.verdict.innerHTML = verdictHTML(q, st, fmt(q.ans), fmt(st.sel)); }
    }
    paint();
  }

  /* ---------- соответствие (match) ---------- */
  function renderMatch(q, qi, card, st) {
    var cols = el('div', 'm-cols');
    var right = el('div', 'm-right');
    right.appendChild(el('div', 'm-h', q.heads ? q.heads[1] : ''));
    q.right.forEach(function (r, i) { right.appendChild(el('div', 'm-ritem', '<b>' + (i + 1) + ')</b> ' + r)); });
    var left = el('div', 'm-left');
    left.appendChild(el('div', 'm-h', q.heads ? q.heads[0] : ''));
    st.sel = st.sel || [];
    var rows = [];
    q.left.forEach(function (txt, i) {
      var row = el('div', 'm-row');
      var lab = el('div', 'm-lab', '<b>' + LET[i] + ')</b> ' + txt + ' <span class="flag"></span>');
      var btns = el('div', 'm-btns');
      var bs = [];
      q.right.forEach(function (_, j) {
        var b = el('button', 'm-b', String(j + 1)); b.type = 'button';
        b.setAttribute('aria-label', LET[i] + ' — ' + (j + 1));
        b.addEventListener('click', function () { if (st.done) return; st.sel[i] = j + 1; save(); paint(); });
        btns.appendChild(b); bs.push(b);
      });
      row.appendChild(lab); row.appendChild(btns);
      var note = q.notes && q.notes[LET[i]];
      if (note) row.appendChild(el('div', 'note', note));
      left.appendChild(row);
      rows.push({ row: row, bs: bs });
    });
    cols.appendChild(left); cols.appendChild(right);
    card.appendChild(cols);
    var A = actions(card);
    function full() { for (var i = 0; i < q.left.length; i++) if (!st.sel[i]) return false; return true; }
    A.btn.addEventListener('click', function () {
      if (!full() || st.done) return;
      st.done = true; st.ok = st.sel.join('') === q.ans; save(); paint(); update();
    });
    function paint() {
      rows.forEach(function (r, i) {
        var v = st.sel[i], a = +q.ans[i], flag = r.row.querySelector('.flag');
        r.row.className = 'm-row'; flag.textContent = '';
        r.bs.forEach(function (b, j) {
          b.className = 'm-b' + (v === j + 1 ? ' on' : '');
          if (st.done && j + 1 === a) b.className += ' ok';
          b.disabled = !!st.done;
        });
        if (st.done) {
          r.row.classList.add(v === a ? 'right' : 'wrong');
          flag.textContent = v === a ? '✓' : '✗ верно: ' + a;
        }
      });
      var n = st.sel.filter(Boolean).length;
      A.picked.textContent = st.done ? '' : (n ? 'Заполнено: ' + n + ' из ' + q.left.length : 'Ничего не выбрано');
      A.btn.disabled = st.done || !full(); A.btn.style.display = st.done ? 'none' : '';
      card.classList.toggle('done', !!st.done);
      if (st.done) {
        var mine = q.left.map(function (_, i) { return st.sel[i] || '–'; }).join('');
        A.verdict.className = 'verdict ' + (st.ok ? 'good' : 'bad');
        A.verdict.innerHTML = verdictHTML(q, st, q.ans, mine);
      }
    }
    paint();
  }

  T.questions.forEach(function (q, qi) {
    var st = state[qi] || (state[qi] = { sel: [], done: false });
    var card = el('article', 'q'); card.id = 'q' + (qi + 1);
    head(card, q, qi);
    if (q.type === 'match') renderMatch(q, qi, card, st); else renderChoice(q, qi, card, st);
    list.appendChild(card);
  });

  var bar = document.getElementById('bar'), cnt = document.getElementById('cnt'), okc = document.getElementById('okc'), res = document.getElementById('result');
  function update() {
    var total = T.questions.length, done = 0, ok = 0;
    T.questions.forEach(function (q, i) { var s = state[i]; if (s && s.done) { done++; if (s.ok) ok++; } });
    bar.style.width = (done / total * 100) + '%';
    cnt.textContent = done + ' из ' + total; okc.textContent = ok;
    if (done === total) {
      res.classList.add('show');
      document.getElementById('score').textContent = ok + ' / ' + total;
      var r = ok / total, msg;
      if (r === 1) msg = 'Идеально! Ни одной ошибки — котики гордятся вами.';
      else if (r >= 0.8) msg = 'Отличный результат! Посмотрите пояснения к заданиям с ошибками.';
      else if (r >= 0.5) msg = 'Неплохо, но есть что подтянуть. Перечитайте запоминашку и разберите ошибки.';
      else msg = 'Стоит вернуться к конспектам и запоминашке, а потом пройти тест ещё раз.';
      document.getElementById('msg').textContent = msg;
    } else res.classList.remove('show');
  }
  update();
  document.getElementById('restart').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    window.scrollTo(0, 0); location.reload();
  });
})();
