from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
import os

doc = Document()

# Set default font
style = doc.styles['Normal']
font = style.font
font.name = 'Microsoft YaHei'
font.size = Pt(10.5)
style.element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')

# Helpers
def set_run_font(run, size=10.5, bold=False, color=None):
    run.font.name = 'Microsoft YaHei'
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')

def h1(text):
    p = doc.add_heading(text, level=1)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in p.runs:
        set_run_font(run, size=22, bold=True, color=(0x14, 0xb8, 0xa6))
    return p

def h2(text):
    p = doc.add_heading(text, level=2)
    for run in p.runs:
        set_run_font(run, size=16, bold=True, color=(0x14, 0xb8, 0xa6))
    return p

def h3(text):
    p = doc.add_heading(text, level=3)
    for run in p.runs:
        set_run_font(run, size=13, bold=True, color=(0x00, 0x00, 0x00))
    return p

def body(text, bold=False):
    p = doc.add_paragraph(text)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    p.paragraph_format.space_after = Pt(6)
    for run in p.runs:
        set_run_font(run, bold=bold)
    return p

def bullet(text, level=0):
    p = doc.add_paragraph(text, style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    for run in p.runs:
        set_run_font(run)
    return p

def code(text):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    run = p.add_run(text)
    set_run_font(run, size=9)
    run.font.name = 'Consolas'
    run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    return p

# ===== Cover =====
h1('IoT 水系统智能监控平台')
h1('用户使用手册')
body('')
body('版本：v1.0')
body('适用前端：Vue 2 + Element UI + ECharts')
body('适用后端：Flask / iot_backend')
body('适用场景：2026 湖南省大学生物联网竞赛')
doc.add_page_break()

# ===== 1 =====
h2('1. 系统概述')
body('IoT 水系统智能监控平台是一套面向水产养殖/工业水系统的实时监控与智能控制平台。平台通过传感器采集水温、压力、流量等数据，结合规则引擎与智能判定服务，实现对水泵、加热器等执行器的自动/手动控制，并支持报警阈值配置、历史记录查询、定时任务管理等功能。')
body('系统采用前后端分离架构，前端基于 Vue 2 + Element UI + ECharts 开发，后端基于 Flask 提供 RESTful API 与 SSE 实时推送。')

h3('1.1 主要功能模块')
bullet('实时监测：水温、压力、流量、设备状态的实时展示与统计')
bullet('设备控制：水泵、加热器的自动/手动模式切换与手动控制')
bullet('智能判定：接入远程判定服务，给出系统运行状态与建议动作')
bullet('规则引擎：可视化配置触发条件与执行动作，支持嵌套分组与优先级')
bullet('报警管理：历史报警查询、报警上下限阈值配置')
bullet('数据记录：传感器历史曲线查询、执行器开关状态曲线')
bullet('定时任务：定时开关设备，支持每天/工作日/周末/仅一次模式')
bullet('系统配置：后端地址、数据源、日志级别、系统复位等')

doc.add_page_break()

# ===== 2 =====
h2('2. 系统架构')
body('前端通过 Axios 调用后端 RESTful API，主要接口路径前缀为 /api。后端通过 SSE（Server-Sent Events）向前端推送实时报警事件。')

h3('2.1 前端技术栈')
bullet('Vue 2 + Vue Router + Vuex')
bullet('Element UI（组件库）')
bullet('ECharts（图表）')
bullet('Axios（HTTP 请求）')
bullet('Capacitor（Android 打包）')

h3('2.2 后端接口约定')
bullet('统一响应格式：{ code, msg, data }，code === 0 表示成功')
bullet('分页格式：{ code, total, page, page_size, data }')
bullet('时间格式：YYYY-MM-DD HH:MM:SS')
bullet('实时推送：SSE 连接到 /api/system/stream')

doc.add_page_break()

# ===== 3 =====
h2('3. 安装与部署')

h3('3.1 环境要求')
bullet('Node.js >= 12.x')
bullet('npm >= 6.x')
bullet('Python >= 3.8（后端）')
bullet('JDK 11（Android 打包）')

h3('3.2 前端启动（开发模式）')
body('1. 进入项目目录：')
code('cd APP-iot')
body('2. 安装依赖：')
code('npm install')
body('3. 启动开发服务器：')
code('npm run serve')
body('4. 浏览器访问：')
code('http://localhost:8080')

h3('3.3 前端构建（生产环境）')
code('npm run build')
body('构建产物输出到 dist/ 目录，可直接部署到 Nginx 或静态服务器。')

h3('3.4 Android 打包')
bullet('安装 Capacitor 依赖：npm install @capacitor/core @capacitor/cli @capacitor/android')
bullet('初始化 Capacitor：npx cap init')
bullet('同步资源：npx cap sync')
bullet('打开 Android Studio：npx cap open android')
body('详细步骤请参考项目文档中的 APK 打包流程说明。')

doc.add_page_break()

# ===== 4 =====
h2('4. 功能使用详解')

# 4.1
h3('4.1 主页（Home）')
body('主页是系统的主要监控入口，包含水槽列表、实时传感器数据、设备控制、智能判定结果和定时任务管理。')

h3('监测单元列表')
bullet('展示所有水槽，点击水槽卡片可进入该水槽的详情页')
bullet('点击「添加水槽」可新增水槽，点击水槽右上角「×」可删除')
bullet('水槽数据持久化在本地 localStorage（iot_water_tanks）')

h3('实时传感器数据')
bullet('展示当前所有启用传感器的实时数值（温度、压力、流量等）')
bullet('显示最近 1000 条采样的平均值（约 50 分钟）')
bullet('流量字段额外显示累计值')
bullet('点击「编辑」可修改传感器的显示名称和单位')
bullet('字段定义来自后端 /monitor/sensor/fields 接口，以后端元数据为权威来源')

h3('设备控制')
bullet('展示所有执行器（水泵、加热器等）的当前状态')
bullet('支持「自动」和「手动」模式切换：')
bullet('  自动模式：设备由后端规则引擎自动控制，前端禁止手动操作')
bullet('  手动模式：可手动开启/关闭设备')
bullet('设备在线状态根据心跳超时自动判断（默认 30 秒）')
bullet('「撤销上次手动控制」可回滚最近一次手动指令')
bullet('设备列表支持增删改，持久化在 localStorage（iot_water_devices）')

h3('定时任务')
bullet('支持定时开关设备，可设置每天/工作日/周末/仅一次')
bullet('同一设备支持多个开关时间点')
bullet('定时任务数据持久化在本地并同步到后端 /schedules 接口')
bullet('仅手动模式下定时任务才下发控制指令')

# 4.2
h3('4.2 记录页（Records）')
body('记录页用于查询传感器历史数据和执行器开关状态曲线。')

h3('传感器曲线查询')
bullet('下拉选择传感器类型（水温 01、水温 02、压力、流量等）')
bullet('选择时间范围，点击「查询」加载历史数据')
bullet('曲线以平滑折线展示，鼠标悬停显示具体数值')
bullet('下方表格展示对应的历史数据记录')

h3('执行器开关曲线')
bullet('独立卡片展示执行器的开关状态曲线')
bullet('选择执行器类型（水泵、加热器等），查询后以阶梯线（step line）展示开关变化')
bullet('阶梯线表示变更后保持原值直到下一个变化点')

# 4.3
h3('4.3 报警页（Alarms）')
body('报警页展示实时报警提示、历史报警记录和报警阈值配置。')

h3('实时报警横幅')
bullet('页面顶部横幅实时显示当前系统报警状态')
bullet('有新报警时自动弹出通知（右上角 Toast）')
bullet('报警来源包括：阈值判定、规则引擎、智能判定、安全保护、手动操作等')
bullet('安全保护（safety）报警以红色高亮显示')

h3('报警上下限设定')
bullet('为每个传感器配置报警上限和下限阈值')
bullet('支持增删传感器阈值字段')
bullet('阈值保存到后端 /config/thresholds 接口')
bullet('压力等可能为负值的传感器支持负阈值输入（下限最低 -100 kPa）')

h3('历史报警查询')
bullet('按时间范围查询历史报警记录')
bullet('显示报警时间、报警内容、来源标签')
bullet('来源标签颜色区分：安全保护（红色）、规则/AI/判定（蓝色）、手动（紫色）、恢复（绿色）')

doc.add_page_break()

# 4.4
h3('4.4 配置页（Config）')
body('配置页是系统的核心配置入口，包含安全联锁规则引擎、系统配置、数据源配置、判定记录查询、操作日志查询和系统维护等功能。')

h3('规则引擎（安全联锁配置）')
body('规则引擎允许用户通过可视化界面配置「如果满足条件则执行动作」的自动化规则。')

bullet('规则 ID：唯一标识符，建议使用英文+下划线，如 rule_low_temp1')
bullet('报警提示：规则触发时的报警文字描述')
bullet('告警级别：warning（提醒）、danger（严重）、info（提示）')
bullet('优先级：数值越小越先执行，冲突时优先执行；默认 100')
bullet('死区（deadband）：触发后的回滞缓冲，避免频繁触发；可选')
bullet('触发条件：支持且/或逻辑，支持嵌套分组，可添加多条条件')
bullet('执行动作：选择要控制的执行器及其目标状态（开启/关闭），可附加说明文字')

body('规则操作：')
bullet('点击「添加规则」新建规则')
bullet('点击规则行的「编辑」修改已有规则')
bullet('点击「删除」移除规则（注意：删除后如需重建建议更换规则 ID）')
bullet('所有规则编辑完成后，点击页面右上角「保存规则」写入后端')

body('条件编辑说明：')
bullet('默认一行条件，点击「条件」添加更多条件')
bullet('点击「分组」可将条件打包成嵌套的且/或分组')
bullet('嵌套分组内可继续添加条件或分组，支持多层嵌套')
bullet('删除分组：仅嵌套分组显示「删除分组」按钮')
bullet('条件字段支持下拉选择或手动输入任意字段名')
bullet('支持比较运算符：>、<、>=、<=、==、!=')

h3('系统配置')
bullet('后端服务地址：比赛现场换网时修改后端 IP/端口')
bullet('判定服务地址：智能判定服务的 URL')
bullet('judge_payload_map：字段映射 JSON，将前端字段映射到判定服务的参数名')

h3('数据源配置')
bullet('数据源类型：serial（串口）或 tcp（网络）')
bullet('TCP 主机与端口：网络数据源时配置')
bullet('心跳超时：设备心跳超时时间（秒），超过视为离线')

h3('判定记录查询')
bullet('查询后端智能判定服务的判定历史')
bullet('显示判定时间、监测单元、判定结论、建议动作')
bullet('动作支持「执行器:状态」格式解析，如 heater:0; pump:0')

h3('操作日志查询')
bullet('查询后端操作日志，支持按设备、日志类型、操作类型筛选')
bullet('支持导出数据库和配置')

h3('系统维护')
bullet('导出数据库：将后端数据库导出为 JSON')
bullet('导出配置：导出当前系统配置')
bullet('导入配置：从 JSON 文件导入配置')
bullet('系统复位：清空所有历史数据并恢复默认（高危操作，需二次确认）')
bullet('日志级别设置：DEBUG / INFO / WARNING / ERROR / CRITICAL')

doc.add_page_break()

# ===== 5 =====
h2('5. 数据结构说明')

h3('5.1 传感器元数据（sensor_meta）')
body('后端通过 /monitor/sensor/fields 接口返回传感器元数据列表，前端以此为依据展示传感器与执行器。')
body('字段说明：')
bullet('field_name：字段标识，如 temp1、pressure、pump')
bullet('display_name：显示名称，如 水温 01、管道压力、水泵')
bullet('unit：单位，如 ℃、kPa、L/min')
bullet('data_type：数据类型，number（数值）或 boolean（布尔）')
bullet('category：类别，sensor（传感器）或 actuator（执行器）')
bullet('is_active：是否启用，1 启用，0 禁用')

h3('5.2 规则 JSON Schema')
body('规则对象结构：')
bullet('id：字符串，必填，唯一标识')
bullet('alarm：字符串，报警提示文字')
bullet('level：字符串，warning / danger / info，默认 warning')
bullet('priority：数字，越小优先级越高，默认 100')
bullet('deadband：数字，可选，回滞缓冲')
bullet('condition：对象，触发条件')
bullet('  logic：字符串，and / or')
bullet('  checks：数组，条件列表')
bullet('    叶子条件：{ field, op, value }')
bullet('    嵌套分组：{ logic, checks }（递归结构）')
bullet('action：对象，执行动作')
bullet('  执行器字段：如 pump: 0/1')
bullet('  message：字符串，动作说明')

h3('5.3 报警阈值格式')
body('阈值保存格式：{ <field>_max: 上限值, <field>_min: 下限值 }')
body('例如：{ temp1_max: 60, temp1_min: 5, pressure_max: 150, pressure_min: 20 }')
body('支持负值：压力等传感器可设置负阈值（下限最低 -100）')

doc.add_page_break()

# ===== 6 =====
h2('6. 操作流程示例')

h3('6.1 配置一条「双温超限开加热器」规则')
body('步骤 1：进入「配置」页面，找到「安全联锁配置」区域')
body('步骤 2：点击「添加规则」')
body('步骤 3：填写规则信息')
bullet('规则 ID：rule_dual_temp_heater')
bullet('报警提示：双水温过高，开启加热器')
bullet('告警级别：warning')
bullet('优先级：10（数值越小越优先）')
body('步骤 4：配置触发条件')
bullet('默认一行条件：字段选 temp1，运算符 >，阈值 45')
bullet('点击「条件」添加第二行：字段选 temp2，运算符 >，阈值 45')
bullet('确认关系为「且」（默认）')
body('步骤 5：配置执行动作')
bullet('加热器：开启（值 1）')
bullet('动作说明：双温超限，启动加热')
body('步骤 6：点击「确定」保存到前端列表')
body('步骤 7：点击页面右上角「保存规则」写入后端')
body('步骤 8：观察后端日志确认规则已加载并生效')

h3('6.2 配置报警阈值')
body('步骤 1：进入「报警」页面')
body('步骤 2：找到「报警上下限设定」区域')
body('步骤 3：为每个传感器设置上限和下限')
bullet('水温 01：上限 60℃，下限 5℃')
bullet('压力：上限 150 kPa，下限 20 kPa')
bullet('流量：上限 5.0 L/min，下限 0.2 L/min')
body('步骤 4：点击「保存阈值」写入后端')
body('步骤 5：如需新增阈值字段，点击「添加阈值」填写字段名、显示名、单位、上下限')

h3('6.3 创建定时任务')
body('步骤 1：进入「主页」页面')
body('步骤 2：找到「定时任务」区域，点击「添加任务」')
body('步骤 3：选择设备（如水泵）')
body('步骤 4：设置重复模式：每天 / 工作日 / 周末 / 仅一次')
body('步骤 5：添加开关时间点，如 08:00 开启、18:00 关闭')
body('步骤 6：点击「确定」保存')
body('注意：定时任务仅在手动模式下下发指令')

doc.add_page_break()

# ===== 7 =====
h2('7. 常见问题与注意事项')

h3('7.1 规则删除后重建同 ID 不生效')
body('现象：删除规则后，用相同 ID 重建规则不生效；更换 ID 后生效。')
body('原因：后端删除规则时未清理该 ID 关联的运行状态（如 last_fired）。')
body('临时方案：删除后重建规则时更换新的 ID。')
body('根本修复：需要后端同学修改删除规则接口，同步清理状态字典中该 rule.id 的条目。详细修复指引请参考项目中的 RULES_DELETE_BUG.md。')

h3('7.2 设备离线无法控制')
body('现象：设备控制按钮显示禁用，提示「设备离线」。')
body('原因：最近一次数据时间戳超过心跳超时阈值（默认 30 秒）。')
body('解决：检查传感器数据采集是否正常，后端是否在运行。')

h3('7.3 报警阈值不能输入负数')
body('压力等传感器可能测量负压（真空），报警下限已放开支持 -100 至正无穷。')
body('如需更低的负值范围，请联系前端开发人员调整输入框 min 属性。')

h3('7.4 规则保存后未生效')
body('检查清单：')
bullet('是否点击了页面上的「保存规则」按钮（弹窗「确定」只是保存到前端内存）')
bullet('查看后端日志 iot_water.log 是否有规则 evaluate 报错')
bullet('检查是否有安全保护规则（safety）覆盖了规则动作')
bullet('检查规则优先级，数值小的规则优先执行')

h3('7.5 数据不同步')
body('现象：主页改的传感器名称，报警页显示的还是旧名称。')
body('解决：刷新页面即可。报警页已实现自动同步传感器名称逻辑，下次加载时会自动对齐。')

doc.add_page_break()

# ===== 8 =====
h2('8. 后端接口速查')

h3('8.1 实时数据接口')
bullet('GET /api/monitor/sensor/latest —— 获取最新传感器数据')
bullet('GET /api/monitor/device/status —— 获取执行器状态')
bullet('GET /api/monitor/judge/latest —— 获取最新判定结果')
bullet('POST /api/monitor/device/control —— 手动控制设备 { field: 0/1 }')
bullet('POST /api/monitor/device/undo —— 撤销上次手动控制')

h3('8.2 规则引擎接口')
bullet('GET /api/config/rules —— 获取规则列表')
bullet('POST /api/config/rules —— 保存规则列表（提交完整数组）')
bullet('DELETE /api/config/rules/<id> —— 删除指定规则')

h3('8.3 报警与阈值接口')
bullet('GET /api/config/thresholds —— 获取报警阈值')
bullet('POST /api/config/thresholds —— 保存报警阈值')
bullet('GET /api/monitor/alarm/active —— 获取当前活跃报警')
bullet('GET /api/monitor/alarm/history —— 获取历史报警记录')

h3('8.4 系统配置接口')
bullet('GET /api/config/all —— 获取所有系统配置')
bullet('POST /api/config/save —— 保存单个配置项')
bullet('POST /api/system/reset —— 系统复位')
bullet('POST /api/system/ai-reset —— 重置 AI 检测状态')
bullet('GET /api/system/stream —— SSE 实时事件流')

h3('8.5 其他接口')
bullet('GET /api/monitor/sensor/fields —— 获取传感器元数据字段列表')
bullet('GET /api/schedules —— 获取定时任务列表')
bullet('POST /api/schedules —— 保存定时任务列表')
bullet('POST /api/monitor/judge —— 手动调用智能判定')

doc.add_page_break()

# ===== 9 =====
h2('9. 故障排查')

h3('9.1 前端页面空白')
bullet('检查浏览器控制台是否有 JS 错误')
bullet('确认后端服务已启动且地址正确（配置页可修改后端地址）')
bullet('清除浏览器缓存后刷新')

h3('9.2 实时数据不更新')
bullet('检查 SSE 连接是否建立（Network 面板查看 /api/system/stream）')
bullet('确认 /api/monitor/sensor/latest 接口正常返回')
bullet('检查设备心跳是否超时（主页显示「离线」）')

h3('9.3 规则不触发')
bullet('确认已点击「保存规则」写入后端')
bullet('检查规则条件字段名与后端 sensor_meta 中的 field_name 一致')
bullet('查看后端日志 iot_water.log 中规则 evaluate 的输出')
bullet('确认没有安全保护规则（safety）覆盖了规则动作')
bullet('确认规则优先级设置合理，没有被更高优先级规则压制')

h3('9.4 Android APK 安装失败')
bullet('确认已启用「未知来源」安装权限')
bullet('检查 APK 签名是否正确')
bullet('确认目标 Android 版本不低于 minSdkVersion')

doc.add_paragraph()
doc.add_paragraph()
p = doc.add_paragraph('— 文档结束 —')
p.alignment = WD_ALIGN_PARAGRAPH.CENTER

out = os.path.join(os.path.expanduser('~'), 'Desktop', 'APP-iot用户使用手册.docx')
doc.save(out)
print('saved to', out)
