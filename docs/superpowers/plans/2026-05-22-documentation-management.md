# 文档管理规范实施计划

> **致代理工作者：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 技能逐任务实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 将文档管理规范集成到 AGENTS.md 中，确保功能实现与文档更新保持同步。

**架构：** 在 AGENTS.md 中添加 "Documentation Management" 章节，包含评估流程、文档更新步骤、场景处理规范和验证检查机制。

**技术栈：** Markdown 文档

---

## 文件结构

在定义任务之前，映射将创建或修改的文件：

- **修改：** `AGENTS.md` — 添加文档管理规范章节
- **创建：** `docs/modules/documentation.md` — 文档管理模块文档（可选）
- **修改：** `docs/features.md` — 添加文档管理功能条目（可选）

## 任务分解

### 任务 1: 在 AGENTS.md 中添加文档管理规范

**文件：**
- 修改：`AGENTS.md:90-91`（在文件末尾添加）

- [ ] **步骤 1: 读取当前 AGENTS.md 文件**

读取 `AGENTS.md` 文件，确认当前内容和结构。

- [ ] **步骤 2: 添加文档管理规范章节**

在 AGENTS.md 文件末尾添加以下内容：

```markdown
## Documentation Management

When implementing features, changes, or deletions, documentation must be updated synchronously to maintain project integrity.

### Pre-Implementation Assessment

Before implementing any feature, complete this assessment:

1. **Impact Analysis**
   - Check `docs/features.md` for related features
   - Check `docs/modules/` for related module documentation
   - Check `docs/architecture.md` for architectural implications
   - Identify potentially affected existing features

2. **Dependency Analysis**
   - Determine existing modules the new feature depends on
   - Determine existing modules that may be affected
   - Assess whether existing modules need modification

3. **Risk Assessment**
   - Evaluate impact level on existing features (High/Medium/Low)
   - Identify potential breaking changes
   - Determine if additional testing is required

### Documentation Update Steps

#### After New Feature Implementation
1. Update `docs/features.md`:
   - Add new feature entry
   - Mark as completed `[x]` or pending `[ ]`
   - Add feature description and related module links

2. Create or update module documentation:
   - For new modules: Create `docs/modules/<module-name>.md`
   - For existing modules: Update corresponding documentation
   - Include module responsibilities, interfaces, and usage methods

3. Update architecture documentation (if needed):
   - Update architecture diagrams in `docs/architecture.md`
   - Update module descriptions and data flow

#### After Existing Feature Changes
1. Update `docs/features.md`:
   - Modify feature description
   - Update status markers
   - Add change description

2. Update related module documentation:
   - Update interface descriptions
   - Update usage methods
   - Update example code

#### After Feature Deletion
1. Update `docs/features.md`:
   - Remove feature entry or mark as deprecated
   - Add deprecation notice

2. Update related module documentation:
   - Remove related interface descriptions
   - Update module responsibility descriptions

### Scenario Handling

#### New Module Development
1. First add feature list in `docs/features.md`
2. Create `docs/modules/<module-name>.md` module documentation
3. Update `docs/architecture.md` architecture documentation
4. Implement module code
5. Update implementation details in module documentation

#### Existing Module Extension
1. Check existing module documentation
2. Assess impact on existing features
3. Update `docs/features.md` feature list
4. Update module documentation
5. Implement extension functionality
6. Update implementation details in documentation

#### Feature Refactoring
1. Document current feature state
2. Assess refactoring impact scope
3. Update `docs/features.md` feature list
4. Update related module documentation
5. Execute refactoring
6. Update change description in documentation

#### Feature Deprecation
1. Mark as deprecated in `docs/features.md`
2. Update related module documentation
3. Add deprecation notice and migration guide (if needed)
4. Execute code cleanup

### Verification Checklists

#### Pre-Implementation Checklist
- [ ] Checked related features in `docs/features.md`
- [ ] Checked related module documentation in `docs/modules/`
- [ ] Assessed impact on existing features
- [ ] Identified documentation that needs updating

#### Post-Implementation Checklist
- [ ] Updated `docs/features.md` (if needed)
- [ ] Created or updated module documentation
- [ ] Updated architecture documentation (if needed)
- [ ] Documentation content matches implementation
- [ ] Documentation format complies with standards

### Documentation Quality Standards
1. **Completeness**: Covers all related features and interfaces
2. **Accuracy**: Consistent with actual implementation
3. **Clarity**: Easy to understand, includes examples
4. **Timeliness**: Updated promptly, reflects current state
5. **Format**: Follows Markdown syntax, uses consistent heading levels and list formats

### Enforcement
- PRs without proper documentation updates should not be merged
- Code reviews must check documentation updates
- Regularly verify consistency between documentation and code
```

- [ ] **步骤 3: 验证格式和一致性**

检查添加的内容是否与 AGENTS.md 现有格式一致：
- 使用相同的标题层级（## 用于主要章节）
- 使用相同的列表格式
- 使用相同的代码块格式
- 保持一致的术语

- [ ] **步骤 4: 提交更改**

```bash
git add AGENTS.md
git commit -m "docs: add documentation management conventions to AGENTS.md"
```

### 任务 2: 更新 features.md 添加文档管理功能（可选）

**文件：**
- 修改：`docs/features.md`

- [ ] **步骤 1: 读取当前 features.md 文件**

读取 `docs/features.md` 文件，确认当前内容和结构。

- [ ] **步骤 2: 添加文档管理功能条目**

在 `docs/features.md` 的适当位置添加：

```markdown
## 文档管理

- [x] 文档管理规范（功能实现与文档更新同步）
- [x] 实现前评估流程（影响范围、依赖关系、风险评估）
- [x] 文档更新步骤（新功能、功能变更、功能删除）
- [x] 验证检查机制（实现前/后检查清单）
```

- [ ] **步骤 3: 提交更改**

```bash
git add docs/features.md
git commit -m "docs: add documentation management feature entry"
```

### 任务 3: 创建文档管理模块文档（可选）

**文件：**
- 创建：`docs/modules/documentation.md`

- [ ] **步骤 1: 创建模块文档**

创建 `docs/modules/documentation.md` 文件：

```markdown
# 文档管理模块

## 概述

文档管理模块定义了 qwenpaw-chatui 项目的文档管理规范，确保功能实现与文档更新保持同步，维护项目文档的完整性和准确性。

## 职责

1. 定义功能实现前的评估流程
2. 规范文档更新的具体步骤
3. 提供各种场景的处理规范
4. 建立验证和检查机制

## 相关文档

- [架构设计文档](../architecture.md)
- [功能清单](../features.md)
- [文档管理规范设计文档](../superpowers/specs/2026-05-22-documentation-management-design.md)

## 使用方法

### 功能实现前评估

1. 检查 `docs/features.md` 中的相关功能
2. 检查 `docs/modules/` 中的相关模块文档
3. 评估对现有功能的影响
4. 识别需要更新的文档

### 文档更新

1. 更新 `docs/features.md`（如需要）
2. 创建或更新模块文档
3. 更新架构文档（如需要）
4. 确保文档内容与实现一致

### 验证检查

1. 实现前检查清单
2. 实现后检查清单
3. 文档质量标准检查
```

- [ ] **步骤 2: 提交更改**

```bash
git add docs/modules/documentation.md
git commit -m "docs: create documentation management module doc"
```

## 执行说明

1. **任务 1 是必需的**：必须将文档管理规范集成到 AGENTS.md 中
2. **任务 2 和 3 是可选的**：根据项目需要决定是否执行
3. **每个任务独立**：可以单独执行，不影响其他任务
4. **提交信息规范**：使用 `docs:` 前缀表示文档变更

## 验证方法

1. 检查 AGENTS.md 是否包含文档管理规范章节
2. 验证规范内容是否完整和准确
3. 确认格式与现有文档一致
4. 测试规范是否易于理解和执行