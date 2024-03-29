# 使用 nvm × node18进行安装
nvm use 18

# 读取 JSON 文件内容
$jsonContent = Get-Content -Raw -Path "./var.json" | ConvertFrom-Json

# 遍历 JSON 对象，生成每一行的文本内容并打印
foreach ($key in $jsonContent.PSObject.Properties.Name) {
    Write-Output "$key=$($jsonContent.$key)"
}

npm i notion-enhancer
cd ../../
asar pack ./notion-enhancer ./app.asar
copy app.asar $($jsonContent.notion_enhancer_path)

# 删除工作区下临时生成的app.asar
Remove-Item -Path "app.asar"


Write-Output "Build finished 🎉"
