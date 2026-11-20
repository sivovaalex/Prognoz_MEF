const fs = require('fs');
const path = require('path');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 840" width="1440" height="840" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.08"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706"/>
    </marker>
  </defs>

  <!-- Background Canvas -->
  <rect x="0" y="0" width="1440" height="840" fill="#f8fafc" rx="12"/>
  <rect x="10" y="10" width="1420" height="820" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" rx="10" filter="url(#shadow)"/>

  <!-- Header Banner -->
  <path d="M 10 20 Q 10 10 20 10 L 1420 10 Q 1430 10 1430 20 L 1430 90 L 10 90 Z" fill="url(#headerGrad)"/>
  <rect x="10" y="87" width="1420" height="3" fill="#3b82f6"/>
  <text x="36" y="44" fill="#ffffff" font-size="19" font-weight="700">📋 BPMN-СХЕМА: Процесс формирования, прикрепления и подписания прогноза СЭР МО с УКЭП</text>
  <text x="36" y="68" fill="#94a3b8" font-size="12.5">Сквозной регламент взаимодействия ОМСУ, ЦИО и МЭФ: замена ручной пересылки через МСЭД на подписание итогового пакета внутри подсистемы</text>

  <!-- SWIMLANES -->
  <!-- Lane 1: Исполнители ОМСУ (y: 90 to 255, height: 165) -->
  <g id="lane-omsu">
    <rect x="10" y="90" width="1420" height="165" fill="#ffffff"/>
    <rect x="10" y="90" width="230" height="165" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
    <line x1="240" y1="90" x2="240" y2="255" stroke="#cbd5e1" stroke-width="2"/>
    <text x="25" y="145" fill="#0f172a" font-size="14" font-weight="700">Исполнители ОМСУ</text>
    <text x="25" y="165" fill="#64748b" font-size="11">Специалисты муниципалитета</text>
    <rect x="25" y="178" width="140" height="20" rx="10" fill="#ecfdf5" stroke="#a7f3d0"/>
    <text x="35" y="192" fill="#059669" font-size="9.5" font-weight="700">МУНИЦИПАЛЬНЫЙ УРОВЕНЬ</text>

    <!-- Lane 1 Content -->
    <!-- Start Event -->
    <circle cx="280" cy="172" r="18" fill="#22c55e" stroke="#15803d" stroke-width="2.5"/>
    <polygon points="275,164 288,172 275,180" fill="#ffffff"/>

    <line x1="298" y1="172" x2="330" y2="172" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 1: Ввод значений ОМСУ -->
    <rect x="330" y="132" width="180" height="80" rx="8" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="345" y="156" fill="#065f46" font-size="12" font-weight="700">1. Ввод значений ОМСУ</text>
    <text x="345" y="176" fill="#334155" font-size="10.5">Ввод показателей прогноза</text>
    <text x="345" y="192" fill="#334155" font-size="10.5">в «Рабочем месте ОМСУ»</text>

    <line x1="510" y1="172" x2="542" y2="172" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 2: ПЗ внутри системы -->
    <rect x="542" y="132" width="185" height="80" rx="8" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="557" y="156" fill="#065f46" font-size="12" font-weight="700">2. ПЗ внутри системы</text>
    <text x="557" y="176" fill="#334155" font-size="10.5">Заполнение таблиц ПЗ</text>
    <text x="557" y="192" fill="#334155" font-size="10.5">в системе (зеленые флажки)</text>

    <line x1="727" y1="172" x2="760" y2="172" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 3: Автосборка пакета ОМСУ -->
    <rect x="760" y="132" width="220" height="80" rx="8" fill="#e6fffa" stroke="#0d9488" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="775" y="156" fill="#115e59" font-size="12" font-weight="700">3. Пакет ОМСУ (Автосборка)</text>
    <text x="775" y="176" fill="#334155" font-size="10.5">Система объединяет в PDF:</text>
    <text x="775" y="194" fill="#0f766e" font-size="10.5" font-weight="600">Таблицы прогноза + ПЗ из системы</text>

    <line x1="980" y1="172" x2="1015" y2="172" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 4: Направление Главе -->
    <rect x="1015" y="132" width="195" height="80" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 2" filter="url(#shadow)"/>
    <text x="1030" y="156" fill="#1e293b" font-size="12" font-weight="700">4. Передача на подпись</text>
    <text x="1030" y="176" fill="#475569" font-size="10.5">Исполнитель нажимает:</text>
    <text x="1030" y="194" fill="#2563eb" font-size="10.5" font-weight="600">«Направить на подпись Главе»</text>

    <!-- Transition down to Lane 3 (Руководитель) -->
    <path d="M 1210 172 L 1260 172 L 1260 480 L 330 480" fill="none" stroke="#059669" stroke-width="1.8" stroke-dasharray="5 3" marker-end="url(#arrow-green)"/>
    <text x="1268" y="320" fill="#059669" font-size="9.5" font-weight="600">Пакет ОМСУ готов</text>
  </g>

  <!-- Lane 2: Исполнители ЦИО (y: 255 to 420, height: 165) -->
  <g id="lane-cio">
    <line x1="10" y1="255" x2="1430" y2="255" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="10" y="255" width="230" height="165" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
    <line x1="240" y1="255" x2="240" y2="420" stroke="#cbd5e1" stroke-width="2"/>
    <text x="25" y="310" fill="#0f172a" font-size="14" font-weight="700">Исполнители ЦИО</text>
    <text x="25" y="330" fill="#64748b" font-size="11">Отраслевые министерства</text>
    <rect x="25" y="343" width="135" height="20" rx="10" fill="#eff6ff" stroke="#bfdbfe"/>
    <text x="35" y="357" fill="#2563eb" font-size="9.5" font-weight="700">РЕГИОНАЛЬНЫЙ УРОВЕНЬ</text>

    <!-- Lane 2 Content -->
    <!-- Start Event -->
    <circle cx="280" cy="337" r="18" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2.5"/>
    <polygon points="275,329 288,337 275,345" fill="#ffffff"/>

    <line x1="298" y1="337" x2="330" y2="337" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 1: Ввод данных ЦИО -->
    <rect x="330" y="297" width="180" height="80" rx="8" fill="#f8fafc" stroke="#3b82f6" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="345" y="321" fill="#1e3a8a" font-size="12" font-weight="700">1. Ввод данных ЦИО</text>
    <text x="345" y="341" fill="#334155" font-size="10.5">Ввод собственных цифр +</text>
    <text x="345" y="357" fill="#334155" font-size="10.5">согласование территорий (синие)</text>

    <line x1="510" y1="337" x2="542" y2="337" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 2: Внешняя ПЗ -->
    <rect x="542" y="297" width="185" height="80" rx="8" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="557" y="321" fill="#b45309" font-size="12" font-weight="700">2. Внешняя ПЗ (Word/PDF)</text>
    <text x="557" y="341" fill="#334155" font-size="10.5">Подготовка текста записки</text>
    <rect x="557" y="351" width="155" height="18" rx="4" fill="#fef3c7" stroke="#fde68a"/>
    <text x="562" y="364" fill="#92400e" font-size="9" font-weight="700">ФОРМИРУЕТСЯ ВНЕ СИСТЕМЫ</text>

    <line x1="727" y1="337" x2="760" y2="337" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 3: Прикрепление в экран -->
    <rect x="760" y="297" width="220" height="80" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="775" y="321" fill="#1e40af" font-size="12" font-weight="700">3. Прикрепление в экран</text>
    <text x="775" y="341" fill="#334155" font-size="10.5">Экспорт таблиц с цифрами +</text>
    <text x="775" y="359" fill="#1d4ed8" font-size="10.5" font-weight="600">прикрепление файла внешней ПЗ</text>

    <line x1="980" y1="337" x2="1015" y2="337" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task 4: Направление Министру -->
    <rect x="1015" y="297" width="195" height="80" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 2" filter="url(#shadow)"/>
    <text x="1030" y="321" fill="#1e293b" font-size="12" font-weight="700">4. Передача на подпись</text>
    <text x="1030" y="341" fill="#475569" font-size="10.5">Исполнитель нажимает:</text>
    <text x="1030" y="359" fill="#2563eb" font-size="10.5" font-weight="600">«Направить на подпись Министру»</text>

    <!-- Transition down to Lane 3 -->
    <path d="M 1112 377 L 1112 435 L 330 435 L 330 495" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="5 3" marker-end="url(#arrow-blue)"/>
    <text x="730" y="430" fill="#2563eb" font-size="9.5" font-weight="600">Пакет ЦИО сформирован и направлен</text>
  </g>

  <!-- Lane 3: Глава ГО / Министр (y: 420 to 600, height: 180) -->
  <g id="lane-chief">
    <line x1="10" y1="420" x2="1430" y2="420" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="10" y="420" width="1420" height="180" fill="#fffdf5"/>
    <rect x="10" y="420" width="230" height="180" fill="#fefce8" stroke="#e2e8f0" stroke-width="1"/>
    <line x1="240" y1="420" x2="240" y2="600" stroke="#cbd5e1" stroke-width="2"/>
    <text x="25" y="475" fill="#0f172a" font-size="14" font-weight="700">Глава ГО / Министр</text>
    <text x="25" y="495" fill="#64748b" font-size="11">Лицо с правом первой подписи</text>
    <rect x="25" y="508" width="145" height="20" rx="10" fill="#fef3c7" stroke="#fde68a"/>
    <text x="35" y="522" fill="#d97706" font-size="9.5" font-weight="700">ПРАВО ПЕРВОЙ ПОДПИСИ (УКЭП)</text>

    <!-- Lane 3 Content -->
    <!-- Task: Экран руководителя: Сдача прогноза -->
    <rect x="280" y="465" width="245" height="88" rx="8" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.8" filter="url(#shadow)"/>
    <text x="295" y="490" fill="#78350f" font-size="12.5" font-weight="700">👤 Экран: Сдача прогноза</text>
    <text x="295" y="510" fill="#334155" font-size="10.5">Предпросмотр единого PDF (цифры + ПЗ)</text>
    <text x="295" y="526" fill="#059669" font-size="10.5" font-weight="600">✓ Все показатели согласованы</text>
    <text x="295" y="542" fill="#64748b" font-size="10">Без необходимости перехода по таблицам</text>

    <line x1="525" y1="509" x2="570" y2="509" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Gateway: Проверка -->
    <g transform="translate(570, 487)">
      <rect x="0" y="0" width="44" height="44" fill="#fef08a" stroke="#ca8a04" stroke-width="2" transform="rotate(45 22 22)" filter="url(#shadow)"/>
      <text x="16" y="28" fill="#854d0e" font-size="16" font-weight="800">✓</text>
    </g>

    <line x1="632" y1="509" x2="675" y2="509" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task: Подписание УКЭП Руководителя -->
    <rect x="675" y="460" width="310" height="98" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2" filter="url(#shadow)"/>
    <text x="690" y="485" fill="#78350f" font-size="13" font-weight="700">✍️ Подписание УКЭП Руководителя</text>
    <rect x="690" y="495" width="280" height="26" rx="4" fill="#1e5c8f"/>
    <text x="702" y="512" fill="#ffffff" font-size="11" font-weight="700">[ Подписать УКЭП и отправить в МЭФ ]</text>
    <rect x="690" y="527" width="195" height="18" rx="3" fill="#dbeafe" stroke="#93c5fd"/>
    <text x="696" y="540" fill="#1e3a8a" font-size="9.5" font-weight="700">🛡️ КриптоПро ЭЦП / Сертификат УКЭП</text>

    <line x1="985" y1="509" x2="1030" y2="509" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task: Авто-отправка -->
    <rect x="1030" y="468" width="180" height="82" rx="8" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="1045" y="494" fill="#713f12" font-size="12" font-weight="700">Пакет подписан</text>
    <text x="1045" y="514" fill="#334155" font-size="10.5">Формирование .sig подписи</text>
    <text x="1045" y="530" fill="#334155" font-size="10.5">и авто-передача в МЭФ</text>

    <!-- Transition down to Lane 4 -->
    <path d="M 1120 550 L 1120 635 L 350 635 L 350 670" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arrow-amber)"/>
    <text x="680" y="628" fill="#b45309" font-size="10" font-weight="600">Официальная сдача прогноза в контур МЭФ</text>
  </g>

  <!-- Lane 4: Минэкономики МО (МЭФ) (y: 600 to 765, height: 165) -->
  <g id="lane-mef">
    <line x1="10" y1="600" x2="1430" y2="600" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="10" y="600" width="230" height="165" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
    <line x1="240" y1="600" x2="240" y2="765" stroke="#cbd5e1" stroke-width="2"/>
    <text x="25" y="655" fill="#0f172a" font-size="14" font-weight="700">Минэкономики МО</text>
    <text x="25" y="675" fill="#64748b" font-size="11">Куратор сбора (МЭФ МО)</text>
    <rect x="25" y="688" width="145" height="20" rx="10" fill="#f5f3ff" stroke="#ddd6fe"/>
    <text x="35" y="702" fill="#7c3aed" font-size="9.5" font-weight="700">ПРИЁМКА И ФИКСАЦИЯ МЭФ</text>

    <!-- Lane 4 Content -->
    <!-- Task: Приемка и верификация -->
    <rect x="280" y="640" width="265" height="85" rx="8" fill="#faf5ff" stroke="#9333ea" stroke-width="1.5" filter="url(#shadow)"/>
    <text x="295" y="666" fill="#581c87" font-size="12.5" font-weight="700">📥 Приёмка и проверка УКЭП</text>
    <text x="295" y="686" fill="#334155" font-size="10.5">Авто-проверка сертификата Главы/Министра</text>
    <text x="295" y="704" fill="#6b21a8" font-size="10.5" font-weight="600">Фиксация штампа времени и даты сдачи</text>

    <line x1="545" y1="682" x2="600" y2="682" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- Task: Статус и блокировка -->
    <rect x="600" y="640" width="310" height="85" rx="8" fill="#f3e8ff" stroke="#7e22ce" stroke-width="2" filter="url(#shadow)"/>
    <text x="615" y="666" fill="#581c87" font-size="12.5" font-weight="700">🔒 Статус: «Представлен с УКЭП»</text>
    <text x="615" y="686" fill="#4c1d95" font-size="10.5" font-weight="700">ПОЛНАЯ БЛОКИРОВКА ДАННЫХ ОТ ИЗМЕНЕНИЙ</text>
    <text x="615" y="704" fill="#334155" font-size="10.5">Юридически чистый комплект в выходных формах</text>

    <line x1="910" y1="682" x2="970" y2="682" stroke="#64748b" stroke-width="1.8" marker-end="url(#arrow)"/>

    <!-- End Event -->
    <g transform="translate(970, 664)">
      <circle cx="18" cy="18" r="20" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
      <circle cx="18" cy="18" r="23" fill="none" stroke="#991b1b" stroke-width="2"/>
      <text x="12" y="24" fill="#ffffff" font-size="16" font-weight="800">✓</text>
    </g>
    <text x="1025" y="680" fill="#15803d" font-size="12" font-weight="700">ПРОГНОЗ СДАН И ПРИНЯТ МЭФ</text>
    <text x="1025" y="698" fill="#64748b" font-size="10.5">Входные формы закрыты, аудит зафиксирован</text>
  </g>

  <!-- Legend Footer -->
  <rect x="10" y="765" width="1420" height="65" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="30" y="785" width="14" height="14" rx="3" fill="#f0fdf4" stroke="#10b981"/>
  <text x="50" y="796" fill="#334155" font-size="11">ОМСУ: ПЗ в системе</text>

  <rect x="200" y="785" width="14" height="14" rx="3" fill="#fffbeb" stroke="#f59e0b"/>
  <text x="220" y="796" fill="#334155" font-size="11">ЦИО: Внешняя ПЗ (Word/PDF)</text>

  <rect x="420" y="785" width="14" height="14" rx="3" fill="#fef3c7" stroke="#d97706"/>
  <text x="440" y="796" fill="#334155" font-size="11">Подписание УКЭП Руководителя</text>

  <rect x="660" y="785" width="14" height="14" rx="3" fill="#faf5ff" stroke="#9333ea"/>
  <text x="680" y="796" fill="#334155" font-size="11">Приёмка и блокировка МЭФ</text>

  <text x="1080" y="796" fill="#94a3b8" font-size="11" font-weight="500">ГАС «Управление» МО · Подсистема «Прогноз СЭР МО» 2.0</text>
</svg>`;

fs.writeFileSync(path.join(__dirname, 'bpmn_ecp_workflow.svg'), svg, 'utf-8');
console.log('bpmn_ecp_workflow.svg successfully created');
