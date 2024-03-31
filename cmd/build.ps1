# git 忽略对配置文件的修改
git update-index --assume-unchanged var.json

# 读取 JSON 文件内容
$jsonContent = Get-Content -Raw -Path "./var.json" | ConvertFrom-Json

# 遍历 JSON 对象，生成每一行的文本内容并打印
foreach ($key in $jsonContent.PSObject.Properties.Name) {
    Write-Output "$key=$($jsonContent.$key)"
}

cd ../../
asar pack ./notion-enhancer ./app.asar --unpack ./notion-enhancer/cmd, ./notion-enhancer/.idea
copy app.asar $($jsonContent.notion_enhancer_path)

# 删除工作区下临时生成的app.asar
Remove-Item -Path "app.asar"

Write-Output "Build finished~ ^_^"
