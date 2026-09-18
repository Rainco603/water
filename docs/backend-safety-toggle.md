# 报警上下限联动开关（safety_enabled）后端对接文档

## 一、需求

新增一个「报警上下限自定义开关」，**关闭后**：

1. 基于报警上下限（阈值）产生的**报警不再生效**（不写报警记录、不推送）；
2. 安全联动（`_check_safety`）**不再自动控制设备**；
3. 规则引擎（`rule`）、AI 判定（`ai/judge`）**不受影响**，照常自动控制设备。

即：用户希望规则引擎可以「不受限制」地自动控制设备，不被报警上下限触发的 safety 联动覆盖。

## 二、为什么前端做不了

| 环节 | 执行方 | 说明 |
|---|---|---|
| 阈值比较 → 生成报警 | 后端 | 后端写 `alarm_log`、推送 SSE；前端只能决定「显示不显示」，记录仍会写库 |
| safety 安全联动自动控制 | 后端 `_check_safety()` | 来源 `safety`、优先级最高，且**手动模式拦不住**（`Controller.send` 的手动拦截不含 `safety`） |

结论：前端最多「隐藏报警展示」，但**无法阻止后端下发 safety 自动控制**，规则引擎仍会被覆盖。必须后端支持。

## 三、后端改动清单

### 1. 新增配置键

- 键名：`safety_enabled`
- 取值：`'1'` 开启（默认），`'0'` 关闭
- 需要加入以下默认列表，保证可导入/可复位：
  - `config_defaults`（用于 `system_reset` 恢复出厂）
  - `config_import` 的默认补全列表（用于旧配置导入时自动补默认值）

> 注意：当前 `system_reset` 的 `config_defaults` 已漏掉 `watchdog_enabled`、`flow_start_grace` 两个键，
> 这次请把 `safety_enabled` 一并加进去，避免「系统复位后开关没被重置」的老问题。

### 2. 安全联动自动控制：在 `_check_safety()` 开头短路

```python
def _check_safety(self, ...):
    # 关闭报警上下限联动后，不再做任何 safety 自动控制
    if get_config('safety_enabled') != '1':
        return
    # ... 原有：高温关加热 / 低温开加热 / 压力高关泵 / 压力低关加热 / 流量高关泵 / 流量低关加热 ...
```

### 3. 阈值报警生成：同样短路

在「传感器数值 vs 阈值 → 写报警记录 / 推送」的那段逻辑里，加同样判断：

```python
if get_config('safety_enabled') != '1':
    return  # 不再产生基于报警上下限的报警
```

> 如果要区分「只关自动控制、保留报警」和「报警与控制一起关」，则拆成两个键；
> 本需求是**报警和自动控制一起关**，用一个 `safety_enabled` 即可。

### 4. 必须保留、不要动

- 规则引擎（`rule`）的触发与自动控制 —— **不受此开关影响**
- `ai / judge` 的自动控制 —— 不受此开关影响
- `watchdog_enabled`（闭环看门狗）是另一个独立开关，逻辑保持不变

## 四、接口（无需新增）

沿用现有配置接口即可，前端直接读写同一个键：

- 读：`GET /api/config/all` → 返回 `{ "safety_enabled": "1" }` 之一
- 写：`POST /api/config/save`，请求体 `{ "safety_enabled": "0" }`

前端在「系统运维 → 安全联动配置」卡片里加一个开关，读写 `safety_enabled`（与现有 `watchdog_enabled` 开关同套路）。

## 五、联调测试用例

1. **关闭开关**：把温度调超上限 → 无报警记录、无 SSE 报警、设备不被 safety 自动关加热。
2. **关闭开关 + 规则引擎**：配置「低温 → 开加热」规则 → 规则仍正常自动开加热，证明规则引擎不受影响。
3. **开启开关**：温度超限 → 恢复原有报警 + safety 自动控制。
4. **配置导入旧配置**：`safety_enabled` 自动补默认 `'1'`。
5. **系统复位**：`safety_enabled` 复位为 `'1'`（依赖第 1 点把键加进 `config_defaults`）。

## 六、给前端的一句话结论

后端加上 `safety_enabled` 后，前端只需：读 `GET /api/config/all` 初始化开关状态 + 用户切换时 `POST /api/config/save` 写 `safety_enabled`。其余报警展示、规则引擎页面无需改动。
