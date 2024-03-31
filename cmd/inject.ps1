# ⚠️ 说明
# 将 notion-enhancer 库复制到 node_module
# 目前不考虑 npm i notion-enhancer 是因为防止其他库的版本改动报错

# 以项目根目录为基准
Set-Location ../

# 定义源文件夹和目标文件夹
$source = ".\shared\notion-enhancer"
$destination = ".\node_modules"

# 复制文件夹及其内容，保持完整目录结构
Copy-Item -Path $source -Destination $destination -Recurse -Container -Force
