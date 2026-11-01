/*
  ArtSpace — main.js
  Небольшой JavaScript без библиотек. Bootstrap сам отвечает за меню,
  модальное окно, вкладки и аккордеон; здесь только то, что требует ТЗ:
  фильтры каталога, подборщик события, заполнение страницы события,
  проверка форм и кнопка «Наверх».
*/
(function () {
  'use strict';

  /* ---------- Вспомогательные функции ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const formatDate = iso =>
    new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const formatWeekday = iso =>
    new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short' });

  const formatPrice = price => (price === 0 ? 'Бесплатно' : price.toLocaleString('ru-RU') + ' ₽');

  const formatLabel = e => (e.format === 'online' ? 'Онлайн' : 'Офлайн');

  function plural(n, forms) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
    return forms[2];
  }

  const labelsHtml = e =>
    e.labels.map(key => `<span class="badge ${LABELS[key].cls}">${LABELS[key].text}</span>`).join('');

  /* ---------- Карточка события (Bootstrap card) ---------- */
  function cardHtml(e) {
    return `
      <div class="col-12 col-md-6 col-xl-4">
        <article class="card event-card h-100 shadow-sm">
          <div class="event-card__poster-wrap">
            <img src="images/posters/${e.id}.svg" class="card-img-top" alt="Постер: ${e.title}" loading="lazy">
            <div class="event-card__labels">${labelsHtml(e)}</div>
          </div>
          <div class="card-body d-flex flex-column">
            <p class="event-card__category mb-1">${CATEGORIES[e.category]}</p>
            <h3 class="card-title h5">${e.title}</h3>
            <ul class="event-card__meta list-unstyled small text-body-secondary mb-3">
              <li><span aria-hidden="true">📅</span> ${formatDate(e.date)}, ${e.time}</li>
              <li><span aria-hidden="true">📍</span> ${e.venue}, ${e.city}</li>
              <li><span aria-hidden="true">🎟️</span> ${formatLabel(e)}</li>
            </ul>
            <p class="fw-bold fs-5 mt-auto mb-3">${formatPrice(e.price)}</p>
            <div class="d-flex gap-2">
              <a class="btn btn-primary" href="product.html?id=${e.id}">Подробнее</a>
              <button class="btn btn-outline-primary" type="button" data-bs-toggle="modal"
                data-bs-target="#eventModal" data-event-id="${e.id}">Кратко</button>
            </div>
          </div>
        </article>
      </div>`;
  }

  /* ---------- Модальное окно «Кратко о событии» ---------- */
  function initEventModal() {
    const modal = $('#eventModal');
    if (!modal) return;

    modal.addEventListener('show.bs.modal', ev => {
      const trigger = ev.relatedTarget;
      const e = trigger && eventById(trigger.dataset.eventId);
      if (!e) return;
      $('#eventModalLabel').textContent = e.title;
      $('#eventModalLabels').innerHTML = labelsHtml(e);
      $('#eventModalDate').textContent = `${formatDate(e.date)}, ${formatWeekday(e.date)}, ${e.time}`;
      $('#eventModalPlace').textContent = `${e.venue}, ${e.city}`;
      $('#eventModalPrice').textContent = e.price === 0 ? 'Бесплатно' : 'от ' + formatPrice(e.price);
      $('#eventModalText').textContent = e.short;
      $('#eventModalLink').href = 'product.html?id=' + e.id;
    });
  }

  /* ---------- Главная: популярные события и подборщик ---------- */
  function initHome() {
    const grid = $('#popular-grid');
    if (grid) {
      const popular = EVENTS.filter(e => e.week)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 6);
      grid.innerHTML = popular.map(cardHtml).join('');
    }

    const form = $('#quiz-form');
    if (!form) return;

    // Баллы: каждый ответ добавляет очки направлениям
    const WEIGHTS = {
      mood: {
        energy: { music: 3, contemporary: 1 },
        calm: { painting: 3, photography: 1 },
        think: { contemporary: 3, photography: 1 },
        story: { theatre: 3, music: 1 }
      },
      company: {
        alone: { photography: 2, painting: 1 },
        couple: { theatre: 2, music: 1 },
        friends: { music: 2, contemporary: 1 },
        family: { theatre: 2, painting: 1, music: 1 }
      }
    };

    const result = $('#quiz-result');

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const data = new FormData(form);
      const mood = data.get('mood');
      const mode = data.get('mode');
      const company = data.get('company');

      if (!mood || !mode || !company) {
        result.innerHTML =
          '<div class="alert alert-warning mb-0" role="alert">Ответьте на все три вопроса, чтобы мы подобрали событие.</div>';
        return;
      }

      const score = {};
      Object.keys(CATEGORIES).forEach(key => (score[key] = 0));
      [WEIGHTS.mood[mood], WEIGHTS.company[company]].forEach(w =>
        Object.keys(w).forEach(key => (score[key] += w[key]))
      );
      const best = Object.keys(score).reduce((a, b) => (score[b] > score[a] ? b : a));

      const params = new URLSearchParams({ category: best });
      if (mode !== 'any') params.set('format', mode);

      const extra = company === 'family' ? ' Ищите метку «Для всей семьи» на карточках.' : '';
      result.innerHTML = `
        <div class="alert alert-success mb-0" role="status">
          <h3 class="h5 alert-heading">Вам подойдёт направление: ${CATEGORIES[best]}</h3>
          <p class="mb-3">Мы подобрали каталог под ваше настроение, формат и компанию.${extra}</p>
          <a class="btn btn-primary" href="catalog.html?${params.toString()}">Смотреть события</a>
        </div>`;
    });

    form.addEventListener('reset', () => {
      result.innerHTML = '';
    });
  }

  /* ---------- Каталог: фильтры, поиск, сортировка ---------- */
  function initCatalog() {
    const grid = $('#events-grid');
    if (!grid) return;

    const controls = {
      category: $('#f-category'),
      city: $('#f-city'),
      date: $('#f-date'),
      price: $('#f-price'),
      q: $('#f-q')
    };
    const sortSelect = $('#f-sort');
    const formatRadios = $$('input[name="format"]');
    const chipsBox = $('#active-filters');
    const count = $('#results-count');
    const empty = $('#empty-state');
    let organizer = '';

    // Читаем параметры из адреса (переход с главной, ссылка организатора)
    const params = new URLSearchParams(location.search);
    ['category', 'city', 'date', 'price'].forEach(key => {
      const value = params.get(key);
      if (!value) return;
      controls[key].value = value;
      if (controls[key].value !== value) controls[key].selectedIndex = 0;
    });
    if (params.get('q')) controls.q.value = params.get('q');
    const urlFormat = formatRadios.find(r => r.value === params.get('format'));
    if (urlFormat) urlFormat.checked = true;
    if (params.get('sort') === 'popular') sortSelect.value = 'popular';
    organizer = params.get('organizer') || '';

    const getFormat = () => (formatRadios.find(r => r.checked) || {}).value || '';

    function matches(e, f) {
      if (f.category && e.category !== f.category) return false;
      if (f.city && e.city !== f.city) return false;
      if (f.format && e.format !== f.format) return false;
      if (f.price && priceBand(e.price) !== f.price) return false;
      if (f.organizer && e.organizer !== f.organizer) return false;
      if (f.q && !e.title.toLowerCase().includes(f.q.toLowerCase())) return false;
      if (f.date) {
        if (f.date === 'week') {
          if (e.date < '2026-11-02' || e.date > '2026-11-08') return false;
        } else if (!e.date.startsWith(f.date)) {
          return false;
        }
      }
      return true;
    }

    // Описание активных фильтров для меток
    function activeFilters() {
      const list = [];
      const optionText = sel => sel.options[sel.selectedIndex].textContent;
      if (controls.category.value) list.push({ key: 'category', text: optionText(controls.category) });
      if (controls.city.value) list.push({ key: 'city', text: controls.city.value });
      if (controls.date.value) list.push({ key: 'date', text: optionText(controls.date) });
      if (controls.price.value) list.push({ key: 'price', text: optionText(controls.price) });
      if (getFormat()) list.push({ key: 'format', text: getFormat() === 'online' ? 'Онлайн' : 'Офлайн' });
      if (controls.q.value.trim()) list.push({ key: 'q', text: 'Поиск: «' + controls.q.value.trim() + '»' });
      if (organizer) list.push({ key: 'organizer', text: 'Организатор: ' + organizer });
      return list;
    }

    function clearFilter(key) {
      if (key === 'format') {
        formatRadios.find(r => r.value === '').checked = true;
      } else if (key === 'organizer') {
        organizer = '';
      } else if (key === 'q') {
        controls.q.value = '';
      } else {
        controls[key].value = '';
      }
      apply();
    }

    function renderChips(filters) {
      chipsBox.textContent = '';
      filters.forEach(f => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const text = document.createElement('span');
        text.textContent = f.text;
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'chip__close';
        close.setAttribute('aria-label', 'Снять фильтр: ' + f.text);
        close.innerHTML = '&times;';
        close.addEventListener('click', () => clearFilter(f.key));
        chip.append(text, close);
        chipsBox.append(chip);
      });
      $('#reset-filters').hidden = filters.length === 0;
    }

    function apply() {
      const filters = {
        category: controls.category.value,
        city: controls.city.value,
        date: controls.date.value,
        price: controls.price.value,
        format: getFormat(),
        q: controls.q.value.trim(),
        organizer
      };
      const list = EVENTS.filter(e => matches(e, filters));

      if (sortSelect.value === 'popular') {
        list.sort((a, b) => b.popularity - a.popularity);
      } else {
        list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      }

      grid.innerHTML = list.map(cardHtml).join('');
      count.textContent = `Найдено: ${list.length} ${plural(list.length, ['событие', 'события', 'событий'])}`;
      empty.hidden = list.length > 0;
      renderChips(activeFilters());
    }

    Object.values(controls).forEach(el => el.addEventListener('input', apply));
    formatRadios.forEach(r => r.addEventListener('change', apply));
    sortSelect.addEventListener('change', apply);

    $$('.js-reset-filters').forEach(btn =>
      btn.addEventListener('click', () => {
        Object.values(controls).forEach(el => (el.value = ''));
        formatRadios.find(r => r.value === '').checked = true;
        organizer = '';
        apply();
      })
    );

    $('#filters-form').addEventListener('submit', ev => ev.preventDefault());
    apply();
  }

  /* ---------- Проверка форм ---------- */
  const RULES = {
    name: v => {
      const s = v.trim();
      if (!s) return 'Введите имя';
      if (s.length < 2) return 'Имя слишком короткое';
      if (!/^[A-Za-zА-Яа-яЁё\s'-]+$/.test(s)) return 'Имя может содержать только буквы';
      return '';
    },
    email: v => {
      const s = v.trim();
      if (!s) return 'Введите адрес электронной почты';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return 'Введите корректный e-mail, например name@mail.ru';
      return '';
    },
    phone: v => {
      let digits = v.replace(/\D/g, '');
      if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1);
      if (!digits) return 'Введите номер телефона';
      if (digits.length !== 10) return 'Номер должен содержать 10 цифр после +7';
      return '';
    },
    guests: v => {
      const n = Number(v);
      if (v === '') return 'Укажите количество гостей';
      if (!Number.isInteger(n) || n < 1 || n > 10) return 'Количество гостей — от 1 до 10';
      return '';
    },
    event: v => (v ? '' : 'Выберите событие'),
    tariff: v => (v ? '' : 'Выберите тариф'),
    topic: v => (v ? '' : 'Выберите тему обращения'),
    message: v => (v.trim().length >= 10 ? '' : 'Сообщение должно содержать не менее 10 символов'),
    agree: checked => (checked ? '' : 'Необходимо согласие на обработку данных')
  };

  function validateField(field) {
    const rule = RULES[field.name];
    if (!rule) return true;
    const value = field.type === 'checkbox' ? field.checked : field.value;
    const message = rule(value);
    const feedback = field.parentElement.querySelector(':scope > .invalid-feedback');

    field.classList.toggle('is-invalid', Boolean(message));
    field.classList.toggle('is-valid', !message);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (feedback) {
      feedback.textContent = message;
      if (!feedback.id) feedback.id = field.id + '-error';
      if (message) field.setAttribute('aria-describedby', feedback.id);
      else field.removeAttribute('aria-describedby');
    }
    return !message;
  }

  function clearValidation(form) {
    $$('[name]', form).forEach(field => {
      field.classList.remove('is-invalid', 'is-valid');
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
  }

  // Подключает проверку к форме; onValid получает данные формы
  function initValidatedForm(form, onValid) {
    const status = $('#form-status');

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      status.textContent = '';
      let firstInvalid = null;
      $$('[name]', form)
        .filter(f => RULES[f.name])
        .forEach(f => {
          if (!validateField(f) && !firstInvalid) firstInvalid = f;
        });

      if (firstInvalid) {
        status.innerHTML =
          '<div class="alert alert-danger" role="alert">Проверьте форму: выделенные поля заполнены неверно.</div>';
        firstInvalid.focus();
        return;
      }
      onValid(new FormData(form), status);
    });

    // Повторная проверка по ходу исправления ошибки и при уходе из поля
    form.addEventListener('input', ev => {
      if (ev.target.classList.contains('is-invalid')) validateField(ev.target);
    });
    form.addEventListener('focusout', ev => {
      const f = ev.target;
      if (RULES[f.name] && (f.value !== '' || f.classList.contains('is-invalid'))) validateField(f);
    });
    form.addEventListener('change', ev => {
      if (RULES[ev.target.name]) validateField(ev.target);
    });
    form.addEventListener('reset', () => {
      clearValidation(form);
      status.textContent = '';
    });
  }

  // Строка «подпись — значение» для сводки заявки (textContent защищает от HTML в данных)
  function summaryRow(dl, term, value) {
    const dt = document.createElement('dt');
    dt.className = 'col-sm-4';
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.className = 'col-sm-8 mb-1';
    dd.textContent = value;
    dl.append(dt, dd);
  }

  function showSuccess(status, title, rows) {
    status.textContent = '';
    const box = document.createElement('div');
    box.className = 'alert alert-success';
    box.setAttribute('role', 'status');
    const h = document.createElement('h3');
    h.className = 'h5 alert-heading';
    h.textContent = title;
    const dl = document.createElement('dl');
    dl.className = 'row mb-0';
    rows.forEach(([term, value]) => summaryRow(dl, term, value));
    box.append(h, dl);
    status.append(box);
    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Форма записи на посещение ---------- */
  function initBooking() {
    const form = $('#booking-form');
    if (!form) return null;

    const eventSelect = $('#booking-event');
    const tariffSelect = $('#booking-tariff');
    const summary = $('#booking-event-summary');
    let current = null;

    function setEvent(e) {
      current = e || null;
      const options = ['<option value="">' + (current ? 'Выберите тариф' : 'Сначала выберите событие') + '</option>'];
      if (current) {
        tariffsOf(current).forEach(t => {
          options.push(`<option value="${t.id}">${t.name} — ${formatPrice(t.price)}</option>`);
        });
      }
      tariffSelect.innerHTML = options.join('');
      tariffSelect.disabled = !current;
      tariffSelect.classList.remove('is-invalid', 'is-valid');
      if (summary) {
        summary.textContent = current
          ? `${formatDate(current.date)}, ${current.time} · ${current.venue}, ${current.city}`
          : 'Выберите событие из списка, чтобы увидеть дату, место и тарифы.';
      }
    }

    if (eventSelect) {
      eventSelect.innerHTML =
        '<option value="">Выберите событие</option>' +
        EVENTS.map(e => `<option value="${e.id}">${e.title} — ${formatDate(e.date)}</option>`).join('');
      const id = new URLSearchParams(location.search).get('id');
      if (id && eventById(id)) eventSelect.value = id;
      setEvent(eventById(eventSelect.value));
      eventSelect.addEventListener('change', () => setEvent(eventById(eventSelect.value)));
    }

    initValidatedForm(form, (data, status) => {
      const tariff = tariffsOf(current).find(t => t.id === data.get('tariff'));
      const guests = Number(data.get('guests'));
      const comment = (data.get('comment') || '').trim();
      const number = 'AS-' + String(Math.floor(10000 + Math.random() * 90000));
      const rows = [
        ['Событие', current.title],
        ['Дата и время', `${formatDate(current.date)}, ${current.time}`],
        ['Место', `${current.venue}, ${current.city}`],
        ['Тариф', `${tariff.name} — ${formatPrice(tariff.price)}`],
        ['Гостей', String(guests)],
        ['Итого', formatPrice(tariff.price * guests)],
        ['Имя', data.get('name').trim()],
        ['E-mail', data.get('email').trim()],
        ['Телефон', '+7 ' + data.get('phone').trim()],
        ['Комментарий', comment || '—']
      ];
      const chosen = current;
      form.reset(); // сначала очищаем форму, затем показываем сводку
      if (eventSelect) eventSelect.value = chosen.id;
      setEvent(chosen);
      showSuccess(status, 'Заявка ' + number + ' принята', rows);
    });

    // После сброса форма возвращается к выбранному событию
    form.addEventListener('reset', () => {
      setTimeout(() => setEvent(eventSelect ? eventById(eventSelect.value) : current), 0);
    });

    return { setEvent };
  }

  /* ---------- Страница события ---------- */
  function initProduct() {
    if (document.body.dataset.page !== 'product') return;

    const id = new URLSearchParams(location.search).get('id');
    const e = eventById(id) || EVENTS[0];
    const set = (sel, text) => ($(sel).textContent = text);

    document.title = `${e.title} — ArtSpace`;
    set('#crumb-title', e.title);
    set('#event-title', e.title);
    set('#event-short', e.short);
    set('#event-category', CATEGORIES[e.category]);
    $('#event-labels').innerHTML = labelsHtml(e);
    const poster = $('#event-poster');
    poster.src = `images/posters/${e.id}.svg`;
    poster.alt = `Постер: ${e.title}`;

    set('#event-datetime', `${formatDate(e.date)}, ${formatWeekday(e.date)}, ${e.time}`);
    set('#event-place', `${e.venue}, ${e.city}`);
    set('#event-format', formatLabel(e));
    set('#event-price', e.price === 0 ? 'Бесплатно' : 'от ' + formatPrice(e.price));
    set('#event-description', e.description);
    set('#event-venue-name', e.venue);
    set('#event-address', e.address);
    set('#event-hours', e.hours);
    set('#event-organizer', e.organizer);
    $('#event-organizer-link').href = 'catalog.html?organizer=' + encodeURIComponent(e.organizer);
    set('#booking-title', 'Запись на событие: ' + e.title);

    $('#event-program').innerHTML = e.program
      .map(([time, text]) => `<li class="list-group-item d-flex gap-3"><strong class="text-primary">${time}</strong><span>${text}</span></li>`)
      .join('');

    $('#tariffs-body').innerHTML = tariffsOf(e)
      .map(t => `<tr><th scope="row">${t.name}</th><td>${t.note}</td><td class="text-end fw-bold">${formatPrice(t.price)}</td></tr>`)
      .join('');

    const booking = initBooking();
    if (booking) booking.setEvent(e);
  }

  /* ---------- Контакты: форма обратной связи ---------- */
  function initContacts() {
    const form = $('#feedback-form');
    if (!form) return;
    initValidatedForm(form, (data, status) => {
      const topic = $('#feedback-topic');
      const rows = [
        ['Тема', topic.options[topic.selectedIndex].textContent],
        ['Имя', data.get('name').trim()],
        ['E-mail', data.get('email').trim()],
        ['Сообщение', data.get('message').trim()]
      ];
      form.reset();
      showSuccess(status, 'Спасибо, сообщение отправлено', rows);
    });
  }

  /* ---------- Кнопка «Наверх» ---------- */
  function initToTop() {
    const button = $('#toTop');
    if (!button) return;
    const toggle = () => (button.hidden = window.scrollY < 400);
    window.addEventListener('scroll', toggle, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    toggle();
  }

  /* ---------- Запуск ---------- */
  const page = document.body.dataset.page;
  initToTop();
  initEventModal();
  if (page === 'home') initHome();
  if (page === 'catalog') initCatalog();
  if (page === 'product') initProduct();
  if (page === 'order') initBooking();
  if (page === 'contacts') initContacts();
})();
