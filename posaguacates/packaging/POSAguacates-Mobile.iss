[Setup]
AppId={{99228B4D-9137-4C33-8492-B1DDC6CE0D14}
AppName=POS Aguacates iPhone Preview
AppVersion=1.0.0
DefaultDirName={autopf}\POS Aguacates
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
OutputDir=..\dist
OutputBaseFilename=POS-Aguacates-iPhone-Preview-Setup-1.0.0
Compression=lzma2
SolidCompression=yes
[Files]
Source: "..\dist\POS-Aguacates-iPhone-Preview\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\instalar.ps1"""; WorkingDir: "{app}"; Flags: waituntilterminated
[UninstallRun]
Filename: "{app}\service\POSAguacates.exe"; Parameters: "stop"; Flags: runhidden; RunOnceId: "StopService"
Filename: "{app}\service\POSAguacates.exe"; Parameters: "uninstall"; Flags: runhidden; RunOnceId: "RemoveService"
