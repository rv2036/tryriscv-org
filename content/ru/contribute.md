---
title: "Участие в проекте"
linkTitle: "Участие"
description: "Сообщайте об ошибках, добавляйте модели, делитесь результатами измерений или участвуйте в ежедневном обновлении данных."
---

## Три самых быстрых способа помочь

<div class="cards cards--3">
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=data-error.yml" target="_blank" rel="noopener">
    <strong>Сообщить об ошибке в данных</strong>
    <span>Неверный параметр, неработающая ссылка, опечатка в названии модели — приложите модель и правильный источник.</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=new-device.yml" target="_blank" rel="noopener">
    <strong>Предложить новый компонент</strong>
    <span>Ссылки на сайт производителя и даташит, ключевые параметры — достаточно одной issue.</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=selection-request.yml" target="_blank" rel="noopener">
    <strong>Отправить запрос на подбор</strong>
    <span>Опишите сценарий, частоту, память, периферию и ограничения по энергопотреблению — мы предложим список кандидатов.</span>
  </a>
</div>

## Как поддерживаются данные

Единственный источник истины — `data/mcu/*.yaml`. Процесс выглядит так:

```text
Сайт производителя / даташит
        │  сбор вручную или с помощью AI
        ▼
data/mcu/<vendor>.yaml   ← единственный источник истины (sources / confidence)
        │  python3 scripts/normalize.py
        ▼
static/data/mcus.json    ← используется для фильтрации и сравнения во фронтенде
        │  hugo --minify
        ▼
GitHub Pages
```

`normalize.py` проверяет обязательные поля, уникальность ID, диапазоны значений и формат ссылок, а затем генерирует JSON для страниц фильтрации. CI запускает проверку перед деплоем.

## Как добавить запись

1. Форкните репозиторий и создайте ветку;
2. Добавьте запись в `data/mcu/<vendor>.yaml` по полям из `research/SCHEMA.md`;
3. Укажите хотя бы одну ссылку на официальный источник и заполните `confidence`;
4. Локально выполните `python3 scripts/normalize.py --check` и `hugo --minify`;
5. Отправьте PR с описанием источника данных и даты сбора.

## Ежедневное обновление

В репозитории есть готовый навык (skill) обновления и скрипты проверки: повторный сбор новинок производителей, проверка неработающих ссылок, подготовка сводки изменений. Сопровождающему достаточно выполнять инструкции из `docs/DAILY-UPDATE.md`.
