@echo off
REM 设定NVM路径
SET PATH=D:/nvm/v18.20.0;%PATH%
REM 设定Notion的app.asar位置
SET notion_path="C:/Users/X/AppData/Local/Programs/Notion Enhanced/resources"

REM 需要先安装nvm -> node 8 18
call nvm use 8
call npm i notion-enhancer
call nvm use 18

REM 打包
cd ../
call asar pack ./notion-enhancer ./app.asar

copy app.asar %notion_path%

pause
