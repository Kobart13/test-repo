// TGStat Exporter Script v2.0
window.TGStatExporter = function () {
  try {
    var items = document.querySelectorAll(".card.peer-item-row,.channel-item");
    if (!items.length) return alert("Каналы не найдены!");

    var data = [];
    items.forEach(function (item) {
      var linkEl = item.querySelector('a[href*="tgstat.ru/channel"]');
      var url = "";
      if (linkEl) {
        var statUrl = linkEl.href;
        var usernameMatch = statUrl.match(/\/channel\/(@[^\/]+)/);
        var cryptoMatch = statUrl.match(/\/channel\/([^@][^\/]+)/);
        if (usernameMatch) {
          url = "https://t.me/" + usernameMatch[1].substring(1);
        } else if (cryptoMatch) {
          url = "https://t.me/joinchat/" + cryptoMatch[1];
        }
      }

      var nameEl =
        item.querySelector(".font-16") ||
        item.querySelector("h6") ||
        item.querySelector(".text-truncate") ||
        item.querySelector("strong");
      var name = nameEl ? nameEl.textContent.trim() : "";

      var h4s = item.querySelectorAll("h4");
      var subs = h4s[0] ? h4s[0].textContent.replace(/[^0-9]/g, "") : "";
      var reach = h4s[1] ? h4s[1].textContent.replace(/[^0-9]/g, "") : "";
      var ci = h4s[2] ? h4s[2].textContent.replace(/[^0-9.]/g, "") : "";

      data.push([url, name, subs, reach, ci]);
    });

    var csv =
      "# Больше пользы здесь: https://t.me/vkobilinskaya\n# \n" +
      "URL,Название,Подписчики,Охват,Индекс цитирования\n" +
      data
        .map(function (row) {
          return row
            .map(function (val) {
              return '"' + String(val).replace(/"/g, '""') + '"';
            })
            .join(",");
        })
        .join("\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tgstat_channels.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (
      confirm(
        "CSV выгружен успешно!\n\nХотите открыть канал https://t.me/vkobilinskaya с полезными материалами по маркетингу?"
      )
    ) {
      window.open("https://t.me/vkobilinskaya", "_blank");
    }
  } catch (e) {
    alert(
      "Ошибка: " +
        e.message +
        "\nПерепроверьте страницу или откройте другой список каналов."
    );
  }
};

// Автоматический запуск при загрузке скрипта
if (window.TGStatExporter) {
  window.TGStatExporter();
}
