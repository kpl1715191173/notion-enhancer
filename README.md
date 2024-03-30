# Notion Enhancer

## 中文

### 简介
解决旧版本的 Notion Enhancer 不兼容新版本 Notion，是在最新版的 Notion Enhancer 的 app.asar 文件提取并修改。

### 安装 
* folk 本项目即可直接可以使用
* 假如你想要自定义一些CSS
  1. 按需修改 /shared/notion-enhancer 里面的代码
  2. 修改 var.json 中的 notion_enhancer_path 属性为 Notion enhancer 的路径
  3. 通过PowerShell运行 cmd/build.ps1

## English

### Introduction
To solve the problem that older versions of Notion Enhancer are incompatible with newer versions of Notion, extract and modify the app.asar file of the latest version of Notion Enhancer.

### Install
* folk this project can be used directly
* If you want to customize some CSS
  1. Modify the code in /shared/notion-enhancer as needed
  2. Modify the notion_enhancer_path attribute in var.json to the path of Notion enhancer
  3. Run cmd/build.ps1 through PowerShell
