Add-Type -AssemblyName System.Drawing

$width = 1440
$height = 840
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Helper functions
function Fill-RoundRect($g, $brush, $x, $y, $w, $h, $r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    $path.Dispose()
}

function Draw-RoundRect($g, $pen, $x, $y, $w, $h, $r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.DrawPath($pen, $path)
    $path.Dispose()
}

function Draw-Rhombus($g, $brush, $pen, $cx, $cy, $w, $h) {
    $hw = $w / 2
    $hh = $h / 2
    $pts = @(
        [System.Drawing.PointF]::new($cx, $cy - $hh),
        [System.Drawing.PointF]::new($cx + $hw, $cy),
        [System.Drawing.PointF]::new($cx, $cy + $hh),
        [System.Drawing.PointF]::new($cx - $hw, $cy)
    )
    if ($brush -ne $null) { $g.FillPolygon($brush, $pts) }
    if ($pen -ne $null) { $g.DrawPolygon($pen, $pts) }
}

function Draw-Arrow($g, $pen, $x1, $y1, $x2, $y2) {
    $g.DrawLine($pen, $x1, $y1, $x2, $y2)
    # Arrow head
    $angle = [Math]::Atan2($y2 - $y1, $x2 - $x1)
    $len = 8.0
    $p1 = [System.Drawing.PointF]::new($x2 - $len * [Math]::Cos($angle - [Math]::PI / 6), $y2 - $len * [Math]::Sin($angle - [Math]::PI / 6))
    $p2 = [System.Drawing.PointF]::new($x2 - $len * [Math]::Cos($angle + [Math]::PI / 6), $y2 - $len * [Math]::Sin($angle + [Math]::PI / 6))
    $brush = New-Object System.Drawing.SolidBrush $pen.Color
    $g.FillPolygon($brush, @([System.Drawing.PointF]::new($x2, $y2), $p1, $p2))
    $brush.Dispose()
}

# Fonts
$fontTitle = [System.Drawing.Font]::new("Segoe UI", [float]13, [System.Drawing.FontStyle]::Bold)
$fontSubtitle = [System.Drawing.Font]::new("Segoe UI", [float]8.5)
$fontLaneTitle = [System.Drawing.Font]::new("Segoe UI", [float]10.5, [System.Drawing.FontStyle]::Bold)
$fontLaneSub = [System.Drawing.Font]::new("Segoe UI", [float]8.5)
$fontBadge = [System.Drawing.Font]::new("Segoe UI", [float]7.5, [System.Drawing.FontStyle]::Bold)
$fontTaskTitle = [System.Drawing.Font]::new("Segoe UI", [float]9, [System.Drawing.FontStyle]::Bold)
$fontTaskText = [System.Drawing.Font]::new("Segoe UI", [float]8)
$fontTag = [System.Drawing.Font]::new("Segoe UI", [float]7.5)
$fontEvent = [System.Drawing.Font]::new("Segoe UI", [float]7.5, [System.Drawing.FontStyle]::Bold)

# 1. Background
$brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))
$g.FillRectangle($brushBg, 0, 0, $width, $height)

# Main Card
$brushCard = [System.Drawing.Brushes]::White
$penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(203, 213, 225)), 1.5
Fill-RoundRect $g $brushCard 10 10 1420 820 10
Draw-RoundRect $g $penBorder 10 10 1420 820 10

# Header
$brushHeader = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
$g.FillRectangle($brushHeader, 10, 10, 1420, 80)
$brushBlueLine = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(59, 130, 246))
$g.FillRectangle($brushBlueLine, 10, 87, 1420, 3)

$brushWhite = [System.Drawing.Brushes]::White
$brushHeaderSub = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(148, 163, 184))
$g.DrawString("BPMN-CXEMA: Процесс формирования, прикрепления и подписания прогноза СЭР МО с УКЭП", $fontTitle, $brushWhite, 36, 26)
$g.DrawString("Сквозной регламент взаимодействия ОМСУ, ЦИО и МЭФ: замена ручной пересылки через МСЭД на подписание итогового пакета внутри подсистемы", $fontSubtitle, $brushHeaderSub, 36, 56)

# Lanes definition:
# Lane 1: Исполнители ОМСУ (y: 90 - 255)
# Lane 2: Исполнители ЦИО (y: 255 - 425)
# Lane 3: Глава ГО / Министр ЦИО (y: 425 - 610)
# Lane 4: Куратор МЭФ МО (y: 610 - 785)

$lanes = @(
    @{ Name = "Исполнители ОМСУ"; Sub = "Специалисты муниципалитета"; Badge = "МУНИЦИПАЛЬНЫЙ УРОВЕНЬ"; Y = 90; H = 165; BadgeBg = [System.Drawing.Color]::FromArgb(236, 253, 245); BadgeText = [System.Drawing.Color]::FromArgb(5, 150, 105) },
    @{ Name = "Исполнители ЦИО"; Sub = "Отраслевые ведомства МО"; Badge = "РЕГИОНАЛЬНЫЙ УРОВЕНЬ"; Y = 255; H = 170; BadgeBg = [System.Drawing.Color]::FromArgb(239, 246, 255); BadgeText = [System.Drawing.Color]::FromArgb(37, 99, 235) },
    @{ Name = "Глава ГО / Министр ЦИО"; Sub = "Владельцы сертификата УКЭП"; Badge = "ПРАВО ПЕРВОЙ ПОДПИСИ"; Y = 425; H = 185; BadgeBg = [System.Drawing.Color]::FromArgb(254, 243, 199); BadgeText = [System.Drawing.Color]::FromArgb(217, 119, 6) },
    @{ Name = "Минэкономики МО (МЭФ)"; Sub = "Куратор прогноза СЭР МО"; Badge = "ПРИЕМКА И КОНТРОЛЬ"; Y = 610; H = 175; BadgeBg = [System.Drawing.Color]::FromArgb(243, 232, 255); BadgeText = [System.Drawing.Color]::FromArgb(126, 34, 206) }
)

$penLaneBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(226, 232, 240)), 1
$penDivider = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(203, 213, 225)), 2
$brushLaneHeader = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))
$brushDark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
$brushMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(100, 116, 139))

foreach ($l in $lanes) {
    # Lane divider
    $g.DrawLine($penLaneBorder, 10, $l.Y, 1430, $l.Y)
    # Header box
    $g.FillRectangle($brushLaneHeader, 10, $l.Y, 230, $l.H)
    $g.DrawLine($penDivider, 240, $l.Y, 240, ($l.Y + $l.H))
    # Titles
    $g.DrawString($l.Name, $fontLaneTitle, $brushDark, 25, ($l.Y + 20))
    $g.DrawString($l.Sub, $fontLaneSub, $brushMuted, 25, ($l.Y + 42))
    # Badge
    $brushBdgBg = New-Object System.Drawing.SolidBrush $l.BadgeBg
    $penBdg = New-Object System.Drawing.Pen $l.BadgeText, 1
    $brushBdgTxt = New-Object System.Drawing.SolidBrush $l.BadgeText
    Fill-RoundRect $g $brushBdgBg 25 ($l.Y + 65) 155 22 11
    Draw-RoundRect $g $penBdg 25 ($l.Y + 65) 155 22 11
    $g.DrawString($l.Badge, $fontBadge, $brushBdgTxt, 33, ($l.Y + 69))
}

# Drawing Pens for Arrows
$penArrowGrey = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 116, 139)), 1.8
$penArrowBlue = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(37, 99, 235)), 1.8
$penArrowGreen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(5, 150, 105)), 1.8
$penArrowAmber = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(217, 119, 6)), 1.8
$penArrowRed = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 38, 38)), 1.8
$penArrowRed.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

# Common Card Drawer
function Draw-TaskCard($g, $x, $y, $w, $h, $title, $lines, $tag, $style) {
    # styles: green, blue, amber, purple, neutral
    $bgCol = [System.Drawing.Color]::FromArgb(255, 255, 255)
    $strokeCol = [System.Drawing.Color]::FromArgb(203, 213, 225)
    $titleCol = [System.Drawing.Color]::FromArgb(15, 23, 42)
    $tagBg = [System.Drawing.Color]::FromArgb(241, 245, 249)
    $tagTxt = [System.Drawing.Color]::FromArgb(71, 85, 105)

    if ($style -eq "green") {
        $bgCol = [System.Drawing.Color]::FromArgb(240, 253, 244)
        $strokeCol = [System.Drawing.Color]::FromArgb(16, 185, 129)
        $titleCol = [System.Drawing.Color]::FromArgb(6, 95, 70)
        $tagBg = [System.Drawing.Color]::FromArgb(220, 252, 231)
        $tagTxt = [System.Drawing.Color]::FromArgb(22, 101, 52)
    } elseif ($style -eq "blue") {
        $bgCol = [System.Drawing.Color]::FromArgb(239, 246, 255)
        $strokeCol = [System.Drawing.Color]::FromArgb(59, 130, 246)
        $titleCol = [System.Drawing.Color]::FromArgb(30, 58, 138)
        $tagBg = [System.Drawing.Color]::FromArgb(219, 234, 254)
        $tagTxt = [System.Drawing.Color]::FromArgb(29, 78, 216)
    } elseif ($style -eq "amber") {
        $bgCol = [System.Drawing.Color]::FromArgb(254, 252, 232)
        $strokeCol = [System.Drawing.Color]::FromArgb(245, 158, 11)
        $titleCol = [System.Drawing.Color]::FromArgb(120, 53, 15)
        $tagBg = [System.Drawing.Color]::FromArgb(254, 240, 138)
        $tagTxt = [System.Drawing.Color]::FromArgb(133, 77, 14)
    } elseif ($style -eq "purple") {
        $bgCol = [System.Drawing.Color]::FromArgb(250, 245, 255)
        $strokeCol = [System.Drawing.Color]::FromArgb(168, 85, 247)
        $titleCol = [System.Drawing.Color]::FromArgb(88, 28, 135)
        $tagBg = [System.Drawing.Color]::FromArgb(243, 232, 255)
        $tagTxt = [System.Drawing.Color]::FromArgb(107, 33, 168)
    }

    $brushB = New-Object System.Drawing.SolidBrush $bgCol
    $penS = New-Object System.Drawing.Pen $strokeCol, 1.5
    Fill-RoundRect $g $brushB $x $y $w $h 8
    Draw-RoundRect $g $penS $x $y $w $h 8

    $brushT = New-Object System.Drawing.SolidBrush $titleCol
    $g.DrawString($title, $fontTaskTitle, $brushT, ($x + 10), ($y + 8))

    $brushTxt = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(51, 65, 85))
    $curY = $y + 26
    foreach ($line in $lines) {
        $g.DrawString($line, $fontTaskText, $brushTxt, ($x + 10), $curY)
        $curY += 15
    }

    if ($tag -ne "") {
        $brushTBg = New-Object System.Drawing.SolidBrush $tagBg
        $brushTTxt = New-Object System.Drawing.SolidBrush $tagTxt
        Fill-RoundRect $g $brushTBg ($x + 10) ($y + $h - 22) ($w - 20) 16 4
        $g.DrawString($tag, $fontTag, $brushTTxt, ($x + 14), ($y + $h - 21))
    }
}

# LANE 1: ОМСУ
# Start circle
$brushStart = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 197, 94))
$penStart = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(21, 128, 61)), 2.5
$g.FillEllipse($brushStart, 260, 155, 36, 36)
$g.DrawEllipse($penStart, 260, 155, 36, 36)
$g.FillPolygon([System.Drawing.Brushes]::White, @([System.Drawing.PointF]::new(273, 166), [System.Drawing.PointF]::new(285, 173), [System.Drawing.PointF]::new(273, 180)))

Draw-Arrow $g $penArrowGrey 296 173 325 173

# Task 1
Draw-TaskCard $g 325 130 175 85 "1. Ввод значений ОМСУ" @("Ввод показателей прогноза", "в «Рабочем месте ОМСУ»") "Утверждено специалистом" "green"

Draw-Arrow $g $penArrowGrey 500 173 530 173

# Task 2
Draw-TaskCard $g 530 130 180 85 "2. Пояснительная записка" @("Заполнение разделов ПЗ", "в экранных формах системы") "Статус ПЗ: Утверждено" "green"

Draw-Arrow $g $penArrowGrey 710 173 740 173

# Task 3
Draw-TaskCard $g 740 130 195 85 "3. Формирование пакета" @("Система формирует PDF:", "• Таблицы показателей", "• Текст утвержденной ПЗ") "Сформирован пакет ОМСУ" "green"

# Arrow from Task 3 down to Lane 3 (Глава)
$g.DrawLine($penArrowGreen, 837, 215, 837, 440)
Draw-Arrow $g $penArrowGreen 837 440 837 475

# LANE 2: ЦИО
# Start circle ЦИО
$brushStartCio = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(59, 130, 246))
$penStartCio = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(29, 78, 216)), 2.5
$g.FillEllipse($brushStartCio, 260, 320, 36, 36)
$g.DrawEllipse($penStartCio, 260, 320, 36, 36)
$g.FillPolygon([System.Drawing.Brushes]::White, @([System.Drawing.PointF]::new(273, 331), [System.Drawing.PointF]::new(285, 338), [System.Drawing.PointF]::new(273, 345)))

Draw-Arrow $g $penArrowGrey 296 338 325 338

# Task 1 ЦИО
Draw-TaskCard $g 325 295 175 85 "1. Ввод значений ЦИО" @("Ввод отраслевых данных", "в «Рабочем месте ЦИО»") "Все показатели утверждены" "blue"

Draw-Arrow $g $penArrowGrey 500 338 530 338

# Task 2 ЦИО
Draw-TaskCard $g 530 295 180 85 "2. Внешняя записка ПЗ" @("Подготовка ПЗ в Word/PDF", "вне подсистемы (отрасль)") "Файл ПЗ готов к загрузке" "blue"

Draw-Arrow $g $penArrowGrey 710 338 740 338

# Task 3 ЦИО
Draw-TaskCard $g 740 295 195 85 "3. Прикрепление и сборка" @("Загрузка внешней ПЗ,", "экспорт выходных таблиц,", "автосборка в единый пакет") "Сформирован пакет ЦИО" "blue"

# Arrow from Task 3 down to Lane 3 (Министр)
$g.DrawLine($penArrowBlue, 855, 380, 855, 440)
Draw-Arrow $g $penArrowBlue 855 440 855 475

# LANE 3: Руководитель (Глава / Министр)
# Task: Проверка и подписание
Draw-TaskCard $g 760 480 260 90 "4. Личный кабинет Руководителя" @("Предпросмотр единого пакета прогноза", "Выбор личного сертификата УКЭП", "Ввод PIN и нажатие «Подписать УКЭП»") "КриптоПро CSP / Web-plugin" "amber"

Draw-Arrow $g $penArrowAmber 1020 525 1060 525

# Gateway: Подписано?
$brushGw = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(254, 240, 138))
$penGw = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(202, 138, 4)), 2
Draw-Rhombus $g $brushGw $penGw 1090 525 60 60
$g.DrawString("?", $fontTitle, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(133, 77, 14))), 1084, 513)

# Arrow from Gateway down to Lane 4 (МЭФ)
$g.DrawLine($penArrowAmber, 1090, 555, 1090, 650)
Draw-Arrow $g $penArrowAmber 1090 650 1090 665
$g.DrawString("Да (УКЭП верна)", $fontTag, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(5, 150, 105))), 1100, 595)

# Reject path back to Lane 1/2
$g.DrawLine($penArrowRed, 1090, 495, 1090, 455)
$g.DrawLine($penArrowRed, 1090, 455, 620, 455)
Draw-Arrow $g $penArrowRed 620 455 620 380
$g.DrawString("Отклонено на доработку", $fontTag, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 38, 38))), 880, 440)

# LANE 4: МЭФ
# Task: Приемка и проверка МЭФ
Draw-TaskCard $g 1000 665 240 85 "5. Автоматическая приемка МЭФ" @("Проверка валидности УКЭП", "Фиксация штампа времени и сертификата", "Блокировка данных от изменений") "Статус: «Представлен с УКЭП»" "purple"

Draw-Arrow $g $penArrowGrey 1240 707 1275 707

# Task: Экспертиза МЭФ
Draw-TaskCard $g 1275 665 110 85 "Экспертиза МЭФ" @("Свод и", "анализ") "" "purple"

Draw-Arrow $g $penArrowGrey 1385 707 1400 707

# End Event
$brushEnd = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(239, 68, 68))
$penEnd = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(185, 28, 28)), 3
$g.FillEllipse($brushEnd, 1400, 692, 30, 30)
$g.DrawEllipse($penEnd, 1400, 692, 30, 30)
$g.FillRectangle([System.Drawing.Brushes]::White, 1410, 702, 10, 10)

# Legend at bottom left
$brushLegBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(241, 245, 249))
Fill-RoundRect $g $brushLegBg 260 755 700 24 6
$g.DrawString("Обозначения:", $fontTag, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(71, 85, 105))), 270, 760)
$g.FillEllipse($brushStart, 345, 761, 10, 10)
$g.DrawString("Старт ОМСУ", $fontTag, $brushDark, 360, 760)
$g.FillEllipse($brushStartCio, 435, 761, 10, 10)
$g.DrawString("Старт ЦИО", $fontTag, $brushDark, 450, 760)
$g.FillRectangle($brushGw, 520, 761, 10, 10)
$g.DrawString("Шлюз проверки", $fontTag, $brushDark, 535, 760)
$g.FillEllipse($brushEnd, 625, 761, 10, 10)
$g.DrawString("Завершение приемки", $fontTag, $brushDark, 640, 760)
$g.DrawLine($penArrowAmber, 760, 766, 785, 766)
$g.DrawString("Подписание УКЭП", $fontTag, $brushDark, 795, 760)

# Save
$outPath = "$PWD\bpmn_ecp_workflow.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Write-Host "bpmn_ecp_workflow.png generated successfully at: $outPath"
