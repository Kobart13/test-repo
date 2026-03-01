(function () {
  "use strict";

  /* === CONSTANTS === */
  var CARDS_PER_PAGE = 5;
  var STORAGE_KEY = "km_workbook_used";
  var NOTES_STORAGE_KEY = "km_workbook_notes";
  var TABS_WITH_NICHES = { "Мета экспетность": true, Конверсия: true };

  /* === STATE === */
  var state = {
    activeTab: "Идеалогия",
    activeCategory: null,
    searchQuery: "",
    workbookMode: false,
    hideUsed: false,
    usedIdeas: {},
    userNotes: {},
    displayedCount: 0,
    filteredData: [],
    highlightedCard: null,
  };

  /* === DOM REFERENCES === */
  var els = {};

  /* === HELPERS === */
  function $(id) {
    return document.getElementById(id);
  }
  function $$(sel, ctx) {
    return (ctx || document).querySelectorAll(sel);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments,
        ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  function getIdeaKey(tabName, idx) {
    return tabName + "::" + idx;
  }

  function getGroupKey(tabName, category, trigger, topic) {
    return tabName + "::g::" + category + "::" + trigger + "::" + (topic || "");
  }

  /* === LOCAL STORAGE === */
  function loadUsedIdeas() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveUsedIdeas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.usedIdeas));
    } catch (e) {
      /* ignore */
    }
  }

  function loadUserNotes() {
    try {
      var raw = localStorage.getItem(NOTES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveUserNotes() {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.userNotes));
    } catch (e) {
      /* ignore */
    }
  }

  /* === CATEGORIES EXTRACTION === */
  function getCategories(tabName) {
    var data = MATRIX_DATA[tabName] || [];
    var seen = {};
    var cats = [];
    for (var i = 0; i < data.length; i++) {
      var cat = data[i].category;
      if (cat && !seen[cat]) {
        seen[cat] = true;
        cats.push(cat);
      }
    }
    return cats;
  }

  /*
   * Фикс объединённых ячеек из Excel: topic заполнен только у первой
   * записи группы. Вызываем один раз при загрузке — пропагируем topic
   * ко всем последующим записям с тем же trigger+category.
   */
  function propagateTopics() {
    for (var tabName in TABS_WITH_NICHES) {
      if (!TABS_WITH_NICHES.hasOwnProperty(tabName)) continue;
      var data = MATRIX_DATA[tabName];
      if (!data) continue;
      var lastTopic = {};
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        var pairKey = (item.trigger || "") + "||" + (item.category || "");
        if (item.topic) {
          lastTopic[pairKey] = item.topic;
        } else if (lastTopic[pairKey]) {
          item.topic = lastTopic[pairKey];
        }
      }
    }
  }

  /* === GROUP DATA BY NICHE (for Экспертность / Конверсия) === */
  function groupByNiche(entries) {
    var groupMap = {};
    var groupOrder = [];

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var item = e.item;
      var gKey = (item.category || "") + "||" + (item.trigger || "") + "||" + (item.topic || "");

      if (!groupMap[gKey]) {
        groupMap[gKey] = {
          category: item.category,
          trigger: item.trigger,
          topic: item.topic,
          niches: [],
          originalIndices: [],
        };
        groupOrder.push(gKey);
      }
      groupMap[gKey].niches.push({
        niche: item.niche || "",
        idea: item.idea || "",
        originalIndex: e.originalIndex,
      });
      groupMap[gKey].originalIndices.push(e.originalIndex);
    }

    var result = [];
    for (var j = 0; j < groupOrder.length; j++) {
      result.push(groupMap[groupOrder[j]]);
    }
    return result;
  }

  /* === FILTER DATA === */
  function filterData() {
    var data = MATRIX_DATA[state.activeTab] || [];
    var query = state.searchQuery.toLowerCase().trim();
    var cat = state.activeCategory;
    var result = [];

    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (cat && item.category !== cat) continue;
      if (query) {
        var searchable = (
          (item.trigger || "") +
          " " +
          (item.topic || "") +
          " " +
          (item.idea || "") +
          " " +
          (item.niche || "") +
          " " +
          (item.category || "")
        ).toLowerCase();
        if (searchable.indexOf(query) === -1) continue;
      }
      result.push({ item: item, originalIndex: i });
    }
    return result;
  }

  /* === RENDER FUNCTIONS === */
  function renderTabs() {
    var tabs = $$(".matrix-tab");
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var tabName = tab.getAttribute("data-tab");
      tab.classList.toggle("active", tabName === state.activeTab);
      var countEl = tab.querySelector(".tab-count");
      if (countEl && MATRIX_DATA[tabName]) {
        countEl.textContent = getTotalIdeasCount(tabName);
      }
    }
  }

  function renderCategories() {
    var cats = getCategories(state.activeTab);
    var html =
      '<button class="category-pill' + (!state.activeCategory ? " active" : "") + '" data-category="">Все</button>';
    for (var i = 0; i < cats.length; i++) {
      var isActive = state.activeCategory === cats[i];
      html +=
        '<button class="category-pill' +
        (isActive ? " active" : "") +
        '" data-category="' +
        escapeHtml(cats[i]) +
        '">' +
        escapeHtml(cats[i]) +
        "</button>";
    }
    els.categories.innerHTML = html;
  }

  /* --- Render a flat card (Идеалогия, Лайфстайл) --- */
  function renderFlatCard(entry, tabName) {
    var item = entry.item;
    var key = getIdeaKey(tabName, entry.originalIndex);
    var isUsed = !!state.usedIdeas[key];
    var note = state.userNotes[key] || "";

    var cls =
      "matrix-card" +
      (isUsed ? " matrix-card--used" : "") +
      (state.highlightedCard === key ? " matrix-card--highlighted" : "");

    var html = '<div class="' + cls + '" data-key="' + escapeHtml(key) + '">';

    // Header
    html += '<div class="matrix-card__header">';
    html += '<span class="matrix-card__field-tag">Триггер:</span>';
    html += '<span class="matrix-card__trigger">' + escapeHtml(item.trigger) + "</span>";
    if (item.category) {
      html += '<span class="matrix-card__field-tag matrix-card__field-tag--muted">Раздел:</span>';
      html += '<span class="matrix-card__category">' + escapeHtml(item.category) + "</span>";
    }
    if (state.workbookMode) {
      html +=
        '<label class="matrix-card__check"><input type="checkbox" ' +
        (isUsed ? "checked" : "") +
        ' data-key="' +
        escapeHtml(key) +
        '"><span class="checkmark"></span></label>';
    }
    html += "</div>";

    // Topic
    if (item.topic) {
      html += '<p class="matrix-card__field-label">Пример темы</p>';
      html += '<p class="matrix-card__topic">' + escapeHtml(item.topic) + "</p>";
    }

    // Idea
    if (item.idea) {
      html += '<div class="matrix-card__idea-wrapper">';
      html += '<p class="matrix-card__field-label">Идея о чём писать</p>';
      html += '<p class="matrix-card__idea">' + escapeHtml(item.idea) + "</p>";
      html += "</div>";
    }

    // User note (workbook mode)
    if (state.workbookMode) {
      html += renderNoteArea(key, note);
    }

    html += "</div>";
    return html;
  }

  /* --- Render a grouped card (Экспертность, Конверсия) --- */
  function renderGroupedCard(group, tabName) {
    var key = getGroupKey(tabName, group.category, group.trigger, group.topic);
    var isUsed = !!state.usedIdeas[key];
    var note = state.userNotes[key] || "";

    var cls =
      "matrix-card matrix-card--grouped" +
      (isUsed ? " matrix-card--used" : "") +
      (state.highlightedCard === key ? " matrix-card--highlighted" : "");

    var html = '<div class="' + cls + '" data-key="' + escapeHtml(key) + '">';

    // Header
    html += '<div class="matrix-card__header">';
    html += '<span class="matrix-card__field-tag">Триггер</span>';
    html += '<span class="matrix-card__trigger">' + escapeHtml(group.trigger) + "</span>";
    if (group.category) {
      html += '<span class="matrix-card__field-tag matrix-card__field-tag--muted">Раздел</span>';
      html += '<span class="matrix-card__category">' + escapeHtml(group.category) + "</span>";
    }
    if (state.workbookMode) {
      html +=
        '<label class="matrix-card__check"><input type="checkbox" ' +
        (isUsed ? "checked" : "") +
        ' data-key="' +
        escapeHtml(key) +
        '"><span class="checkmark"></span></label>';
    }
    html += "</div>";

    // Topic (shared)
    if (group.topic) {
      html += '<p class="matrix-card__field-label">Пример темы</p>';
      html += '<p class="matrix-card__topic">' + escapeHtml(group.topic) + "</p>";
    }

    // Niche sub-items
    html += '<div class="matrix-card__idea-wrapper">';
    html += '<p class="matrix-card__field-label">Идея о чём писать (по нишам)</p>';
    html += '<div class="matrix-card__niches">';
    for (var i = 0; i < group.niches.length; i++) {
      var n = group.niches[i];
      html += '<div class="matrix-card__niche-item">';
      html += '<span class="matrix-card__niche-badge">📌 ' + escapeHtml(n.niche) + "</span>";
      if (n.idea) {
        html += '<p class="matrix-card__niche-idea">' + escapeHtml(n.idea) + "</p>";
      }
      html += "</div>";
    }
    html += "</div>";
    html += "</div>";

    // User note (workbook mode)
    if (state.workbookMode) {
      html += renderNoteArea(key, note);
    }

    html += "</div>";
    return html;
  }

  /* --- Note area for workbook mode --- */
  function renderNoteArea(key, note) {
    var hasNote = note && note.trim().length > 0;
    var html = '<div class="matrix-card__note-area">';
    if (hasNote) {
      html +=
        '<textarea class="matrix-card__note-input matrix-card__note-input--visible" data-note-key="' +
        escapeHtml(key) +
        '" placeholder="Моя идея для поста...">' +
        escapeHtml(note) +
        "</textarea>";
    } else {
      html +=
        '<button class="matrix-card__note-toggle" data-note-key="' +
        escapeHtml(key) +
        '">✏️ Добавить свою идею</button>';
      html +=
        '<textarea class="matrix-card__note-input" data-note-key="' +
        escapeHtml(key) +
        '" placeholder="Моя идея для поста..."></textarea>';
    }
    html += "</div>";
    return html;
  }

  /* === RENDER CARDS WITH CATEGORY SECTIONS === */
  function renderCards() {
    var filtered = filterData();
    var isNicheTab = !!TABS_WITH_NICHES[state.activeTab];
    var displayItems;

    if (isNicheTab) {
      displayItems = groupByNiche(filtered);
      if (state.hideUsed) {
        displayItems = displayItems.filter(function(group) {
          var k = getGroupKey(state.activeTab, group.category, group.trigger, group.topic);
          return !state.usedIdeas[k];
        });
      }
    } else {
      displayItems = filtered;
      if (state.hideUsed) {
        displayItems = displayItems.filter(function(entry) {
          var k = getIdeaKey(state.activeTab, entry.originalIndex);
          return !state.usedIdeas[k];
        });
      }
    }

    state.filteredData = displayItems;
    state.displayedCount = Math.min(CARDS_PER_PAGE, displayItems.length);

    var html = renderItemRange(0, state.displayedCount, displayItems, isNicheTab);

    els.cards.innerHTML =
      html || '<div class="matrix-empty">Ничего не найдено. Попробуйте изменить фильтр или поисковый запрос.</div>';

    var hasMore = state.displayedCount < displayItems.length;
    els.loadMore.style.display = hasMore ? "block" : "none";
    if (hasMore) {
      $("loadMoreBtn").textContent = "Показать ещё (" + (displayItems.length - state.displayedCount) + " осталось)";
    }

    renderStats();
    renderResultsInfo();
  }

  function renderItemRange(start, end, items, isNicheTab) {
    var html = "";
    var lastCategory = start > 0 ? getCategoryOf(items[start - 1], isNicheTab) : null;

    for (var i = start; i < end; i++) {
      var currentCat = getCategoryOf(items[i], isNicheTab);
      // Insert category section header when category changes
      if (!state.activeCategory && currentCat !== lastCategory) {
        html +=
          '<div class="matrix-category-header"><span class="matrix-category-header__icon">▸</span><span class="matrix-category-header__text">' +
          escapeHtml(currentCat) +
          "</span></div>";
        lastCategory = currentCat;
      }

      if (isNicheTab) {
        html += renderGroupedCard(items[i], state.activeTab);
      } else {
        html += renderFlatCard(items[i], state.activeTab);
      }
    }
    return html;
  }

  function getCategoryOf(item, isNicheTab) {
    if (isNicheTab) return item.category || "";
    return (item.item && item.item.category) || "";
  }

  function loadMoreCards() {
    var start = state.displayedCount;
    var end = Math.min(start + CARDS_PER_PAGE, state.filteredData.length);
    var isNicheTab = !!TABS_WITH_NICHES[state.activeTab];

    var html = renderItemRange(start, end, state.filteredData, isNicheTab);
    els.cards.insertAdjacentHTML("beforeend", html);
    state.displayedCount = end;

    var hasMore = state.displayedCount < state.filteredData.length;
    els.loadMore.style.display = hasMore ? "block" : "none";
    if (hasMore) {
      $("loadMoreBtn").textContent =
        "Показать ещё (" + (state.filteredData.length - state.displayedCount) + " осталось)";
    }
    renderStats();
  }

  function renderStats() {
    if (!state.workbookMode) {
      els.stats.innerHTML = "";
      return;
    }

    var total = getTotalCount();
    var usedCount = countUsed();

    var pct = total > 0 ? Math.round((usedCount / total) * 100) : 0;
    els.stats.innerHTML =
      '<div class="stats-bar">' +
      '<div class="stats-bar__fill" style="width:' +
      pct +
      '%;"></div>' +
      "</div>" +
      '<span class="stats-text">Использовано карточек: ' +
      usedCount +
      " из " +
      total +
      " (" +
      pct +
      "%)</span>";
  }

  function getTotalIdeasCount(tabName) {
    var data = MATRIX_DATA[tabName] || [];
    return data.length;
  }

  function countIdeasInDisplay(items, isNicheTab) {
    if (!isNicheTab) return items.length;
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += (items[i].niches && items[i].niches.length) || 0;
    }
    return total;
  }

  function getTotalCount() {
    var data = MATRIX_DATA[state.activeTab] || [];
    if (TABS_WITH_NICHES[state.activeTab]) {
      var flat = [];
      for (var j = 0; j < data.length; j++) flat.push({ item: data[j], originalIndex: j });
      return groupByNiche(flat).length;
    }
    return data.length;
  }

  function countUsed() {
    var data = MATRIX_DATA[state.activeTab] || [];
    var count = 0;

    if (TABS_WITH_NICHES[state.activeTab]) {
      var flat = [];
      for (var j = 0; j < data.length; j++) flat.push({ item: data[j], originalIndex: j });
      var groups = groupByNiche(flat);
      for (var i = 0; i < groups.length; i++) {
        var gk = getGroupKey(state.activeTab, groups[i].category, groups[i].trigger, groups[i].topic);
        if (state.usedIdeas[gk]) count++;
      }
    } else {
      for (var k = 0; k < data.length; k++) {
        if (state.usedIdeas[getIdeaKey(state.activeTab, k)]) count++;
      }
    }
    return count;
  }

  function renderResultsInfo() {
    var isNicheTab = !!TABS_WITH_NICHES[state.activeTab];
    var totalIdeas = getTotalIdeasCount(state.activeTab);
    var filteredCards = state.filteredData.length;
    var filteredIdeas = countIdeasInDisplay(state.filteredData, isNicheTab);
    if (state.searchQuery || state.activeCategory) {
      if (isNicheTab) {
        els.resultsInfo.textContent =
          "Найдено: " + filteredCards + " карточек · " + filteredIdeas + " из " + totalIdeas + " идей";
      } else {
        els.resultsInfo.textContent = "Найдено: " + filteredIdeas + " из " + totalIdeas + " идей";
      }
      els.resultsInfo.style.display = "block";
    } else {
      els.resultsInfo.style.display = "none";
    }
  }

  /* === RANDOM IDEA === */
  function showRandomIdea() {
    var data = MATRIX_DATA[state.activeTab] || [];
    if (data.length === 0) return;

    var existingRandom = document.querySelector(".matrix-random-result");
    if (existingRandom) existingRandom.remove();

    var isNicheTab = !!TABS_WITH_NICHES[state.activeTab];
    var cardHtml;

    if (isNicheTab) {
      var flat = [];
      for (var j = 0; j < data.length; j++) flat.push({ item: data[j], originalIndex: j });
      var groups = groupByNiche(flat);
      var group = groups[Math.floor(Math.random() * groups.length)];
      cardHtml = renderGroupedCard(group, state.activeTab);
    } else {
      var idx = Math.floor(Math.random() * data.length);
      var entry = { item: data[idx], originalIndex: idx };
      cardHtml = renderFlatCard(entry, state.activeTab);
    }

    var popup =
      '<div class="matrix-random-result">' +
      '<div class="random-result-header">' +
      '<span class="random-result-label">🎲 Случайная идея</span>' +
      '<button class="random-result-close" id="closeRandomResult">✕</button>' +
      "</div>" +
      cardHtml +
      "</div>";

    els.cards.insertAdjacentHTML("beforebegin", popup);

    var resultEl = document.querySelector(".matrix-random-result");
    var cardEl = resultEl.querySelector(".matrix-card");
    if (cardEl) cardEl.classList.add("matrix-card--highlighted");

    resultEl.scrollIntoView({ behavior: "smooth", block: "center" });

    $("closeRandomResult").addEventListener("click", function () {
      resultEl.remove();
    });

    setTimeout(function () {
      if (cardEl) cardEl.classList.remove("matrix-card--highlighted");
    }, 4000);
  }

  /* === EXPORT === */
  function exportWorkbook() {
    var allTabs = Object.keys(MATRIX_DATA);
    var exported = [];

    for (var t = 0; t < allTabs.length; t++) {
      var tabName = allTabs[t];
      var data = MATRIX_DATA[tabName];
      var isNicheTab = !!TABS_WITH_NICHES[tabName];

      if (isNicheTab) {
        var flat = [];
        for (var j = 0; j < data.length; j++) flat.push({ item: data[j], originalIndex: j });
        var groups = groupByNiche(flat);
        for (var g = 0; g < groups.length; g++) {
          var gk = getGroupKey(tabName, groups[g].category, groups[g].trigger, groups[g].topic);
          var isUsed = !!state.usedIdeas[gk];
          var note = state.userNotes[gk] || "";
          if (isUsed || note) {
            exported.push({
              tab: tabName,
              category: groups[g].category,
              trigger: groups[g].trigger,
              topic: groups[g].topic,
              niches: groups[g].niches,
              note: note,
              used: isUsed,
            });
          }
        }
      } else {
        for (var i = 0; i < data.length; i++) {
          var key = getIdeaKey(tabName, i);
          var isUsed2 = !!state.usedIdeas[key];
          var note2 = state.userNotes[key] || "";
          if (isUsed2 || note2) {
            exported.push({
              tab: tabName,
              category: data[i].category,
              trigger: data[i].trigger,
              topic: data[i].topic,
              idea: data[i].idea,
              note: note2,
              used: isUsed2,
            });
          }
        }
      }
    }

    if (exported.length === 0) {
      alert("Нет сохранённых или дополненных карточек для экспорта.");
      return;
    }

    /* Меняем текст кнопки на время генерации */
    var btn = $("exportBtn");
    var origText = btn.textContent;
    btn.textContent = "⏳ Генерация PDF...";
    btn.disabled = true;

    function cleanupExportUi() {
      btn.textContent = origText;
      btn.disabled = false;
    }

    try {
      if (!window.pdfMake) {
        cleanupExportUi();
        alert("PDF-библиотека не загружена. Обновите страницу и попробуйте снова.");
        return;
      }

      var tabNames = {
        Идеалогия: "Идеология",
        "Контекстный Лайфстайл": "Лайфстайл",
        "Мета экспетность": "Экспертность",
        Конверсия: "Конверсия",
      };

      var byTab = {};
      for (var x = 0; x < exported.length; x++) {
        var tab = exported[x].tab;
        if (!byTab[tab]) byTab[tab] = [];
        byTab[tab].push(exported[x]);
      }

      var totalUsed = 0;
      var totalNotes = 0;
      var content = [];

      content.push({ text: "Мой контент-план", style: "title" });
      content.push({
        text: "Экспорт из Контент-Матрицы · " + new Date().toLocaleDateString("ru-RU"),
        style: "subtitle",
      });

      for (var tabKey in byTab) {
        if (!byTab.hasOwnProperty(tabKey)) continue;
        var tabItems = byTab[tabKey];

        content.push({ text: (tabNames[tabKey] || tabKey) + " (" + tabItems.length + ")", style: "tabHeader" });

        for (var j = 0; j < tabItems.length; j++) {
          var it = tabItems[j];
          if (it.used) totalUsed++;
          if (it.note) totalNotes++;

          var cardBody = [];
          
          var metaArr = [];
          if (it.trigger) metaArr.push(it.trigger);
          if (it.category) metaArr.push(it.category);
          if (it.used) metaArr.push("✅ Использовано");
          
          var meta = metaArr.join("  ·  ");
          
          if (meta) cardBody.push({ text: meta, style: "meta" });
          if (it.topic) cardBody.push({ text: it.topic, style: "topic" });

          if (it.niches && it.niches.length) {
            for (var n = 0; n < it.niches.length; n++) {
              cardBody.push({ text: "• " + (it.niches[n].niche || "Ниша"), style: "nicheTitle" });
              if (it.niches[n].idea) cardBody.push({ text: it.niches[n].idea, style: "idea" });
            }
          } else if (it.idea) {
            cardBody.push({ text: it.idea, style: "idea" });
          }

          if (it.note) {
            cardBody.push({ text: "Моя идея: " + it.note, style: "note" });
          }

          content.push({
            margin: [0, 4, 0, 10],
            unbreakable: true,
            table: {
              headerRows: 0,
              widths: ["*"],
              body: [
                [
                  {
                    fillColor: "#fafafa",
                    stack: cardBody,
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: function() { return 1; },
              vLineWidth: function(i) { return i === 0 ? 3 : 1; },
              hLineColor: function() { return '#eeeeee'; },
              vLineColor: function(i) { return i === 0 ? '#ff0080' : '#eeeeee'; },
              paddingLeft: function() { return 12; },
              paddingRight: function() { return 12; },
              paddingTop: function() { return 10; },
              paddingBottom: function() { return 10; }
            }
          });
        }
      }

      content.push({
        text: "Всего карточек: " + exported.length + " · Использовано: " + totalUsed + " · С заметками: " + totalNotes,
        style: "footer",
      });

      var docDefinition = {
        pageSize: "A4",
        pageMargins: [32, 28, 32, 28],
        content: content,
        defaultStyle: {
          font: "Roboto",
          fontSize: 10,
          color: "#222222",
          lineHeight: 1.3,
        },
        styles: {
          title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
          subtitle: { fontSize: 10, color: "#666666", margin: [0, 0, 0, 10] },
          tabHeader: { fontSize: 14, bold: true, color: "#ff0080", margin: [0, 12, 0, 8] },
          meta: { fontSize: 9, bold: true, color: "#7b7b7b", margin: [0, 0, 0, 4] },
          topic: { fontSize: 11, bold: true, color: "#222222", margin: [0, 0, 0, 6] },
          nicheTitle: { fontSize: 10, bold: true, color: "#0d47a1", margin: [0, 2, 0, 1] },
          idea: { fontSize: 10, color: "#333333", margin: [0, 0, 0, 4] },
          note: { fontSize: 10, italics: true, color: "#d81b60", margin: [0, 4, 0, 0] },
          footer: { fontSize: 10, bold: true, color: "#444444", margin: [0, 10, 0, 0] },
        },
      };

      var finished = false;
      function finishOnce() {
        if (finished) return;
        finished = true;
        cleanupExportUi();
      }

      window.pdfMake.createPdf(docDefinition).download("Мой_контент-план.pdf", finishOnce);
      setTimeout(finishOnce, 1500);
    } catch (err) {
      console.error("PDF export error:", err);
      cleanupExportUi();
      alert("Ошибка при создании PDF. Попробуйте ещё раз.");
    }
  }

  function buildExportContent(items) {
    var tabColors = {
      Идеалогия: "#e91e63",
      "Контекстный Лайфстайл": "#9c27b0",
      "Мета экспетность": "#1976d2",
      Конверсия: "#f57c00",
    };
    var tabNames = {
      Идеалогия: "🎯 Идеология",
      "Контекстный Лайфстайл": "✨ Лайфстайл",
      "Мета экспетность": "🧠 Экспертность",
      Конверсия: "💰 Конверсия",
    };

    var h = '<div style="text-align:center;margin-bottom:30px;">';
    h += '<h1 style="font-size:24px;margin-bottom:6px;">📋 Мой контент-план</h1>';
    h +=
      '<p style="color:#888;font-size:13px;">Экспорт из Контент-Матрицы &middot; ' +
      new Date().toLocaleDateString("ru-RU") +
      "</p></div>";

    var byTab = {};
    for (var i = 0; i < items.length; i++) {
      var tab = items[i].tab;
      if (!byTab[tab]) byTab[tab] = [];
      byTab[tab].push(items[i]);
    }

    var totalUsed = 0;
    var totalNotes = 0;

    for (var tabKey in byTab) {
      if (!byTab.hasOwnProperty(tabKey)) continue;
      var tabItems = byTab[tabKey];
      var color = tabColors[tabKey] || "#333";
      var name = tabNames[tabKey] || tabKey;

      h +=
        '<div style="margin-bottom:24px;"><div style="font-size:17px;font-weight:700;padding:10px 14px;border-radius:8px;color:#fff;margin-bottom:12px;background:' +
        color +
        ';">' +
        escapeHtml(name) +
        " (" +
        tabItems.length +
        ")</div>";

      for (var j = 0; j < tabItems.length; j++) {
        var it = tabItems[j];
        if (it.used) totalUsed++;
        if (it.note) totalNotes++;

        h +=
          '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:14px 16px;margin-bottom:10px;page-break-inside:avoid;">';
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">';
        h +=
          '<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:#ffe0ee;color:#e91e63;">' +
          escapeHtml(it.trigger) +
          "</span>";
        h +=
          '<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:#f5f5f5;color:#666;">' +
          escapeHtml(it.category) +
          "</span>";
        if (it.used)
          h +=
            '<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:#e8f5e9;color:#388e3c;">✓ Использовано</span>';
        h += "</div>";

        if (it.topic)
          h += '<p style="font-weight:600;font-size:13px;margin-bottom:4px;">' + escapeHtml(it.topic) + "</p>";

        if (it.niches) {
          for (var n = 0; n < it.niches.length; n++) {
            h += '<div style="padding:5px 0;' + (n > 0 ? "border-top:1px dashed #eee;" : "") + '">';
            h +=
              '<span style="font-size:10px;color:#1976d2;background:#e3f2fd;padding:2px 5px;border-radius:3px;">📌 ' +
              escapeHtml(it.niches[n].niche) +
              "</span> ";
            h += '<span style="font-size:13px;color:#444;">' + escapeHtml(it.niches[n].idea) + "</span>";
            h += "</div>";
          }
        } else if (it.idea) {
          h += '<p style="font-size:13px;line-height:1.5;color:#444;">' + escapeHtml(it.idea) + "</p>";
        }

        if (it.note) {
          h +=
            '<div style="background:#fffde7;border-left:3px solid #ffd54f;padding:8px 12px;margin-top:8px;border-radius:5px;font-size:13px;line-height:1.5;white-space:pre-wrap;">';
          h +=
            '<div style="font-size:10px;font-weight:700;color:#f57c00;text-transform:uppercase;margin-bottom:3px;">✏️ Моя идея</div>';
          h += escapeHtml(it.note);
          h += "</div>";
        }

        h += "</div>";
      }

      h += "</div>";
    }

    h +=
      '<div style="text-align:center;color:#888;font-size:12px;margin-top:24px;padding-top:12px;border-top:1px solid #eee;">Всего карточек: ' +
      items.length +
      " &middot; Использовано: " +
      totalUsed +
      " &middot; С заметками: " +
      totalNotes +
      "</div>";
    return h;
  }

  /* === EVENT HANDLERS === */
  function onTabClick(e) {
    var tab = e.target.closest(".matrix-tab");
    if (!tab) return;
    var tabName = tab.getAttribute("data-tab");
    if (tabName === state.activeTab) return;

    state.activeTab = tabName;
    state.activeCategory = null;
    state.highlightedCard = null;
    renderTabs();
    renderCategories();
    renderCards();
  }

  function onCategoryClick(e) {
    var pill = e.target.closest(".category-pill");
    if (!pill) return;
    var cat = pill.getAttribute("data-category");
    state.activeCategory = cat || null;
    state.highlightedCard = null;
    renderCategories();
    renderCards();
  }

  function onSearchInput() {
    var val = $("matrixSearch").value;
    state.searchQuery = val;
    state.highlightedCard = null;
    $("clearSearch").style.display = val ? "inline-flex" : "none";
    renderCards();
  }

  function onClearSearch() {
    $("matrixSearch").value = "";
    state.searchQuery = "";
    state.highlightedCard = null;
    $("clearSearch").style.display = "none";
    renderCards();
  }

  function onWorkbookToggle() {
    state.workbookMode = $("workbookMode").checked;
    $("workbookHint").style.display = state.workbookMode ? "block" : "none";
    $("exportSection").style.display = state.workbookMode ? "flex" : "none";
    $("hideUsedWrapper").style.display = state.workbookMode ? "flex" : "none";
    renderCards();
  }

  function onHideUsedToggle() {
    state.hideUsed = $("hideUsedBtn").checked;
    renderCards();
  }

  function onCardCheckbox(e) {
    if (!e.target.matches('input[type="checkbox"][data-key]')) return;
    var key = e.target.getAttribute("data-key");
    if (e.target.checked) {
      state.usedIdeas[key] = true;
    } else {
      delete state.usedIdeas[key];
    }
    saveUsedIdeas();

    var card = e.target.closest(".matrix-card");
    if (card) {
      card.classList.toggle("matrix-card--used", e.target.checked);
    }
    renderStats();
    
    if (state.hideUsed) {
      renderCards(); // Hide card if "hide used" is enabled
    }
  }

  function onNoteToggle(e) {
    var btn = e.target.closest(".matrix-card__note-toggle");
    if (!btn) return;
    var noteArea = btn.parentElement;
    var textarea = noteArea.querySelector(".matrix-card__note-input");
    if (textarea) {
      textarea.classList.add("matrix-card__note-input--visible");
      btn.style.display = "none";
      textarea.focus();
    }
  }

  function onNoteChange(e) {
    if (!e.target.matches(".matrix-card__note-input")) return;
    var key = e.target.getAttribute("data-note-key");
    var val = e.target.value.trim();
    if (val) {
      state.userNotes[key] = val;
    } else {
      delete state.userNotes[key];
    }
    saveUserNotes();
  }

  function onLoadMore() {
    loadMoreCards();
  }

  /* === INIT === */
  function init() {
    if (typeof MATRIX_DATA === "undefined") {
      console.error("MATRIX_DATA not loaded");
      return;
    }

    /* Фикс объединённых ячеек Excel: пропагируем topic при загрузке */
    propagateTopics();

    els.tabs = $("matrixTabs");
    els.categories = $("matrixCategories");
    els.cards = $("matrixCards");
    els.loadMore = $("matrixLoadMore");
    els.stats = $("matrixStats");
    els.resultsInfo = $("matrixResultsInfo");

    state.usedIdeas = loadUsedIdeas();
    state.userNotes = loadUserNotes();

    renderTabs();
    renderCategories();
    renderCards();

    els.tabs.addEventListener("click", onTabClick);
    els.categories.addEventListener("click", onCategoryClick);
    $("matrixSearch").addEventListener("input", debounce(onSearchInput, 250));
    $("clearSearch").addEventListener("click", onClearSearch);
    $("workbookMode").addEventListener("change", onWorkbookToggle);
    $("hideUsedBtn").addEventListener("change", onHideUsedToggle);
    els.cards.addEventListener("change", onCardCheckbox);
    els.cards.addEventListener("click", onNoteToggle);
    els.cards.addEventListener("input", debounce(onNoteChange, 500));
    $("randomIdeaBtn").addEventListener("click", showRandomIdea);
    $("loadMoreBtn").addEventListener("click", onLoadMore);
    $("exportBtn").addEventListener("click", exportWorkbook);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
