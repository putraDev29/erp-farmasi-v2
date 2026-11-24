@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=C:\Users\WAHANA 26\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "d:\project\erp-farmasi-v2\mobile"
"C:\src\flutter\bin\flutter.bat" run -d emulator-5554
