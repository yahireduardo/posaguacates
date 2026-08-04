[Setup]
AppId={{C4F4BDB3-922F-4AD5-91E4-7EF32DC2FE1B}
AppName=POS Aguacates
AppVersion=1.0.0
DefaultDirName={autopf}\POS Aguacates
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
OutputDir=..\dist
OutputBaseFilename=POS-Aguacates-Setup-1.0.0
Compression=lzma2
SolidCompression=yes
[Files]
Source: "..\dist\POS-Aguacates\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\instalar.ps1"""; WorkingDir: "{app}"; Flags: waituntilterminated
[UninstallRun]
Filename: "{app}\service\POSAguacates.exe"; Parameters: "stop"; Flags: runhidden; RunOnceId: "StopService"
Filename: "{app}\service\POSAguacates.exe"; Parameters: "uninstall"; Flags: runhidden; RunOnceId: "RemoveService"
