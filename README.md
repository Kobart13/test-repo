# Как опубликовать сайт в GitHub Pages

Этот репозиторий содержит статический сайт с информацией о налогах для предпринимателей. Ниже приведена инструкция по публикации сайта в GitHub Pages.

## 📋 Содержимое репозитория

- `index.html` - главная страница сайта
- `ShapovalovyBuh/index.html` - дополнительная страница
- `.github/workflows/pages.yml` - автоматическая настройка GitHub Pages

## 🚀 Инструкция по публикации в GitHub Pages

### Шаг 1: Включить GitHub Pages в настройках репозитория

1. Перейдите в **Settings** (Настройки) вашего репозитория
2. Найдите раздел **Pages** в боковом меню
3. В разделе **Source** выберите **GitHub Actions**
4. Сохраните настройки

### Шаг 2: Запустить автоматическое развертывание

После настройки GitHub Pages:
1. Переместите изменения в ветку `main`
2. GitHub Actions автоматически запустит процесс развертывания
3. Сайт будет доступен по адресу: `https://kobart13.github.io/test-repo/`

### Шаг 3: Проверить развертывание

1. Перейдите во вкладку **Actions** репозитория
2. Убедитесь, что workflow "Deploy to GitHub Pages" выполнился успешно
3. Откройте ваш сайт по ссылке GitHub Pages

## 🔧 Технические детали

### Автоматическое развертывание

Файл `.github/workflows/pages.yml` настроен для:
- Автоматического развертывания при изменениях в ветке `main`
- Ручного запуска через интерфейс GitHub
- Использования официальных GitHub Actions для Pages

### Структура сайта

- **Главная страница**: Доступна по корневому URL
- **Подстраница**: Доступна по пути `/ShapovalovyBuh/`
- **Внешние ресурсы**: Tailwind CSS и Font Awesome загружаются из CDN

## 🎯 Альтернативные способы публикации

### Вариант 1: Через веб-интерфейс GitHub
1. Зайдите в Settings → Pages
2. Выберите Source: "Deploy from a branch"
3. Выберите ветку `main` и папку `/ (root)`

### Вариант 2: Использование GitHub Desktop
1. Клонируйте репозиторий в GitHub Desktop
2. Сделайте изменения в файлах
3. Commit и Push в ветку `main`
4. GitHub Pages автоматически обновится

## 📱 Проверка на мобильных устройствах

Сайт оптимизирован для мобильных устройств благодаря:
- Responsive дизайну с Tailwind CSS
- Meta viewport теги
- Touch-оптимизированные кнопки

## 🔍 Решение проблем

### Сайт не отображается
1. Проверьте статус GitHub Actions
2. Убедитесь, что GitHub Pages включен в настройках
3. Проверьте, что файлы находятся в ветке `main`

### CSS/JavaScript не загружается
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что внешние CDN доступны
3. Проверьте относительные пути к файлам

## 📞 Контакты

Если возникли вопросы по настройке GitHub Pages, обратитесь к [документации GitHub](https://docs.github.com/en/pages).- [ShapovalovyBuh/trf_shpb_v4.html](https://Kobart13.github.io/test-repo/ShapovalovyBuh/trf_shpb_v4.html)
- [LookFita/trf_lf_dsh_v1.html](https://Kobart13.github.io/test-repo/LookFita/trf_lf_dsh_v1.html)
- [RenderHouse/rh_7_oshibok_lm.html](https://Kobart13.github.io/test-repo/RenderHouse/rh_7_oshibok_lm.html)
- [ImageProxy/image-proxy.html](https://Kobart13.github.io/test-repo/ImageProxy/image-proxy.html)
- [LocalGeneratorDemo/local-generator-demo.html](https://Kobart13.github.io/test-repo/LocalGeneratorDemo/local-generator-demo.html)
- [KirillovaPsy/trf_psy_nomoney_v4.html](https://Kobart13.github.io/test-repo/KirillovaPsy/trf_psy_nomoney_v4.html)
- [TGStatExport/](https://Kobart13.github.io/test-repo/TGStatExport/) - folder: TGStatExport
- [TestEmpty/](https://Kobart13.github.io/test-repo/TestEmpty/) - folder: test-empty-folder
- [Common/trf_common_x1.html](https://Kobart13.github.io/test-repo/Common/trf_common_x1.html)
- [TrafficPulse/lm_trfpulse_a1_v2.html](https://Kobart13.github.io/test-repo/TrafficPulse/lm_trfpulse_a1_v2.html)
- [pomodoro/index.html](https://Kobart13.github.io/test-repo/pomodoro/index.html)
- [trf_old55_v1/trf_old55_v1.html](https://Kobart13.github.io/test-repo/trf_old55_v1/trf_old55_v1.html)
- [trf_old55_v2/trf_old55_v2.html](https://Kobart13.github.io/test-repo/trf_old55_v2/trf_old55_v2.html)
- [BuduRyadom/](https://Kobart13.github.io/test-repo/BuduRyadom/) - folder: BuduRyadom
- [opal_VideoMarketer/](https://Kobart13.github.io/test-repo/opal_VideoMarketer/) - folder: tmp
- [LyuduSurgery/trf_event1511.html](https://Kobart13.github.io/test-repo/LyuduSurgery/trf_event1511.html)
- [lyudu_event/trf_event1511.html](https://Kobart13.github.io/test-repo/lyudu_event/trf_event1511.html)
- [KontentMatritsa/](https://Kobart13.github.io/test-repo/KontentMatritsa/) - folder: KontentMatritsa
